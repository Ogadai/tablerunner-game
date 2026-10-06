'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import type { PlayerSnapshot } from '@/lib/store/types';
import type { RaceInstructionTeam } from '@/lib/runner/race-of-fire/race-types';
import { setPlayerRaceTeam } from '@/lib/runner/race-of-fire/server-actions';

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
  { value: null, label: 'Independent (no team)' },
] as const;

export default function TeamSelectionContent({
  boardId,
  mapId,
  snapshot,
  onSnapshotChange,
  disabled = false,
}: TeamSelectionContentProps) {
  const groupId = useId();
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
    <fieldset disabled={disabled || isPending || !snapshot.gameState} aria-busy={isPending}>
      <legend>Choose your team</legend>
      {teams.map(team => (
        <label key={team.value ?? 'independent'}>
          <input
            type="radio"
            name={groupId}
            value={team.value ?? 'independent'}
            checked={selectedTeam === team.value}
            onChange={() => changeTeam(team.value)}
          />
          {team.label}
        </label>
      ))}
      <p>Team changes take effect when the turn is processed.</p>
      {isPending && <p role="status">Saving team...</p>}
      {error && <p role="alert">{error}</p>}
    </fieldset>
  );
}
