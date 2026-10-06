'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import EntityList, { EntityItemClass, type EntityItemDetail } from '../../[playerId]/entity-list';
import { characters } from '@/lib/games/characters';
import type { PlayerSnapshot } from '@/lib/store/types';
import type { RaceInstructionTeam } from '@/lib/runner/race-of-fire/race-types';
import { setPlayerRaceTeam } from '@/lib/runner/race-of-fire/server-actions';
import styles from './team-selection-content.module.css';

interface TeamSelectionContentProps {
  boardId: string;
  mapId: string;
  snapshot: PlayerSnapshot;
  onSnapshotChange: (snapshot: PlayerSnapshot) => void;
  disabled?: boolean;
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
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const saving = useRef(false);
  const instructions = snapshot.instructions as RaceInstructionTeam;
  const state = snapshot.gameState?.processState['crystal-shard'] as {
    blueTeam?: string[];
    redTeam?: string[];
  } | undefined;
  const currentTeam = state?.blueTeam?.includes(snapshot.playerId) ? 'blue'
    : state?.redTeam?.includes(snapshot.playerId) ? 'red' : null;
  const selectedTeam = Object.hasOwn(instructions, 'team') ? instructions.team ?? null : currentTeam;
  const choicesDisabled = disabled || isPending || !snapshot.gameState;
  const getPlayerTeam = (playerId: string) => playerId === snapshot.playerId ? selectedTeam
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
    return () => { requestId.current += 1; };
  }, [boardId, mapId, snapshot]);

  const changeTeam = (team: RaceInstructionTeam['team']) => {
    if (disabled || saving.current || !snapshot.gameState || team === selectedTeam) return;
    saving.current = true;
    const currentRequest = ++requestId.current;
    setError(null);

    startTransition(async () => {
      try {
        const result = await setPlayerRaceTeam(boardId, mapId, snapshot.playerId, {
          ...instructions,
          team,
        });
        if (currentRequest !== requestId.current) return;
        if (result.success && result.data) {
          onSnapshotChange({ ...snapshot, instructions: result.data });
        } else {
          setError(result.error || 'Unable to change team. Please try again.');
        }
      } catch {
        if (currentRequest === requestId.current) {
          setError('Unable to change team. Please try again.');
        }
      } finally {
        saving.current = false;
      }
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
      {error && <p className={styles.statusMessage} role="alert">{error}</p>}
    </div>
  );
}
