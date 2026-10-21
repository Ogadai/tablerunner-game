'use client';

import { startTransition, useActionState, useEffect, useOptimistic, useRef, useState } from 'react';
import EntityList, { EntityItemClass, type EntityItemDetail } from '../../[playerId]/entity-list';
import { characters } from '@/lib/games/characters';
import type { PlayerSnapshot } from '@/lib/store/types';
import type { RaceInstructionTeam, RaceTeamSelections } from '@/lib/runner/race-of-fire/race-types';
import { getPlayerRaceTeams, setPlayerRaceTeam } from '@/lib/runner/race-of-fire/server-actions';
import { GameTopicMessageType, getGameTopicId } from '@/lib/message-types';
import RaceTeamTopicService from '@/app/message-bus/race-team-topic-service';
import styles from './team-selection-content.module.css';

interface TeamSelectionContentProps {
  boardId: string;
  mapId: string;
  snapshot: PlayerSnapshot;
  onSnapshotChange: (snapshot: PlayerSnapshot) => void;
  disabled?: boolean;
}

interface TeamChange {
  team: RaceInstructionTeam['team'];
  context: string;
  requestId: number;
}

interface TeamSaveState {
  context: string;
  error: string | null;
}

const teams = [
  { value: 'blue', label: 'Blue team' },
  { value: 'red', label: 'Red team' },
  { value: null, label: 'No team' },
] as const;

export default function TeamSelectionContent({
  boardId,
  mapId,
  snapshot,
  onSnapshotChange,
  disabled = false,
}: TeamSelectionContentProps) {
  const selectionContext = JSON.stringify([boardId, mapId, snapshot.gameState?.turn]);
  const choicesDisabled = disabled || !snapshot.gameState;
  const context = JSON.stringify([selectionContext, snapshot.playerId, choicesDisabled]);
  const [selections, setTeamSelections] = useState<{ context: string; teams: RaceTeamSelections } | null>(null);
  const teamSelections = selections?.context === selectionContext ? selections.teams : {};
  const [loadError, setLoadError] = useState<string | null>(null);
  const liveUpdates = useRef<RaceTeamSelections>({});
  const requestId = useRef(0);
  const snapshotRef = useRef(snapshot);
  const onSnapshotChangeRef = useRef(onSnapshotChange);
  const instructions = snapshot.instructions as RaceInstructionTeam;
  const state = snapshot.gameState?.processState['crystal-shard'] as {
    blueTeam?: string[];
    redTeam?: string[];
  } | undefined;
  const currentTeam = state?.blueTeam?.includes(snapshot.playerId) ? 'blue'
    : state?.redTeam?.includes(snapshot.playerId) ? 'red' : null;
  const confirmedTeam = Object.hasOwn(teamSelections, snapshot.playerId) ? teamSelections[snapshot.playerId]
    : Object.hasOwn(instructions, 'team') ? instructions.team ?? null : currentTeam;
  const [selectedTeam, selectOptimistically] = useOptimistic(confirmedTeam, (current, change: TeamChange) =>
    change.context === context ? change.team ?? null : current);
  const getPlayerTeam = (playerId: string) => playerId === snapshot.playerId ? selectedTeam
    : Object.hasOwn(teamSelections, playerId) ? teamSelections[playerId]
    : state?.blueTeam?.includes(playerId) ? 'blue'
    : state?.redTeam?.includes(playerId) ? 'red' : null;

  const getTeamEntities = (team: RaceInstructionTeam['team']): EntityItemDetail[] =>
    (snapshot.gameState?.players ?? [])
      .filter(player => getPlayerTeam(player.id) === team)
      .map(player => ({
        id: player.id,
        name: player.name,
        iconXY: snapshot.gameState?.characters.find(character => character.id === player.id)?.iconXY
          ?? characters[player.id].iconXY,
        className: player.id === snapshot.playerId ? EntityItemClass.self
          : team !== null && team === selectedTeam ? EntityItemClass.friendly : EntityItemClass.enemy,
        health: player.health,
        maxHealth: player.baseStats?.health || player.health,
      }));

  useEffect(() => {
    snapshotRef.current = snapshot;
    onSnapshotChangeRef.current = onSnapshotChange;
  }, [snapshot, onSnapshotChange]);

  useEffect(() => {
    return () => { requestId.current += 1; };
  }, [context]);

  useEffect(() => {
    if (!snapshot.gameState) return;
    let active = true;
    liveUpdates.current = {};
    const refreshTeams = async () => {
      try {
        const result = await getPlayerRaceTeams(boardId, mapId);
        if (!active) return;
        if (result.success && result.data) {
          // Preserve messages received while the initial request was in flight.
          setTeamSelections({ context: selectionContext, teams: { ...result.data, ...liveUpdates.current } });
          setLoadError(null);
        } else {
          setLoadError(result.error || 'Unable to load team selections.');
        }
      } catch {
        if (active) {
          setLoadError('Unable to load team selections.');
        }
      }
    };

    const unsubscribe = RaceTeamTopicService.subscribe(getGameTopicId(boardId, mapId), message => {
      liveUpdates.current[message.playerId] = message.team;
      setTeamSelections(previous => ({
        context: selectionContext,
        teams: { ...(previous?.context === selectionContext ? previous.teams : {}), [message.playerId]: message.team },
      }));
    });
    void refreshTeams();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [boardId, mapId, snapshot.gameState, selectionContext]);

  const [saveState, saveTeam, isPending] = useActionState<TeamSaveState, TeamChange>(async (previous, change) => {
    if (change.requestId !== requestId.current) return previous;

    try {
      const result = await setPlayerRaceTeam(boardId, mapId, snapshot.playerId, {
        ...snapshotRef.current.instructions,
        team: change.team,
      });
      if (change.requestId !== requestId.current) return previous;
      if (!result.success || !result.data) {
        return { context: change.context, error: result.error || 'Unable to change team. Please try again.' };
      }

      const nextSnapshot = { ...snapshotRef.current, instructions: result.data };
      const savedTeam = result.data.team ?? null;
      snapshotRef.current = nextSnapshot;
      startTransition(() => {
        onSnapshotChangeRef.current(nextSnapshot);
        RaceTeamTopicService.raiseRaceTeamUpdated(getGameTopicId(boardId, mapId), {
          type: GameTopicMessageType.RaceTeamUpdated,
          playerId: snapshot.playerId,
          team: savedTeam,
        });
      });
      return { context: change.context, error: null };
    } catch {
      if (change.requestId !== requestId.current) return previous;
      return { context: change.context, error: 'Unable to change team. Please try again.' };
    }
  }, { context, error: null });
  const error = saveState.context === context ? saveState.error : null;

  const changeTeam = (team: RaceInstructionTeam['team']) => {
    if (choicesDisabled || team === selectedTeam) return;
    const change: TeamChange = { team, context, requestId: requestId.current };

    startTransition(() => {
      selectOptimistically(change);
      saveTeam(change);
    });
  };

  return (
    <div aria-busy={isPending} className={styles.teamSelectionContent}>
      <div className={styles.teamList}>
        {teams.map(team => (
          <div key={team.value ?? 'independent'} className={styles.teamRow}>
            <button
              type="button"
              className={`${styles.teamButton} ${team.value ? styles[team.value] : ''}`}
              disabled={choicesDisabled}
              aria-pressed={selectedTeam === team.value}
              onClick={() => changeTeam(team.value)}
            >
              <span>{team.label}</span>
            </button>
            <div className={styles.teamPlayers}>
              <EntityList entities={getTeamEntities(team.value)} />
            </div>
          </div>
        ))}
      </div>
      {isPending && <p className={styles.statusMessage} role="status">Saving...</p>}
      {!isPending && error && <p className={styles.statusMessage} role="alert">{error}</p>}
      {loadError && <p className={styles.statusMessage} role="alert">{loadError}</p>}
    </div>
  );
}
