'use client';

import { useRef, useState } from 'react';
import { Switch } from 'radix-ui';
import { monsters } from '@/lib/games/monsters';

import styles from './monster-card.module.css';
import { MonsterState, PlayerState } from '@/lib/store/types';
import EntityBaseStats from './entity-base-stats';
import { getMonsterStats } from '@/lib/runner/monster-stats';
import { warlordEditParty } from '@/lib/runner/warlords-of-fire/server-actions';

export default function MonsterCard({
  boardId,
  mapId,
  player,
  monster,
  canAttack,
  onAttack,
  onPartyChanged,
  processing = false,
}: {
  boardId: string,
  mapId: string,
  player: PlayerState,
  monster: MonsterState,
  canAttack: boolean,
  onAttack: () => void,
  onPartyChanged: (inParty: boolean) => void,
  processing?: boolean,
}) {
  const monsterStats = getMonsterStats(monster);
  const [savingParty, setSavingParty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const partyPending = useRef(false);
  const inParty = monster.masterId === player.id;
  const sameTeam = player.team !== null && monster.team === player.team;
  const canEditParty = sameTeam && player.health > 0 && monster.health > 0
    && (!monster.masterId || inParty) && monster.location === player.location.id && !processing;

  const editParty = async (checked: boolean) => {
    if (!canEditParty || partyPending.current) return;
    partyPending.current = true;
    setSavingParty(true);
    setError(null);
    try {
      const response = await warlordEditParty(boardId, mapId, player.id, monster.id, checked);
      if (!response.success) throw new Error(response.error || 'Unable to update party.');
      onPartyChanged(checked);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      partyPending.current = false;
      setSavingParty(false);
    }
  };

  return <>
    <span className={styles.monsterIcon}
      style={{
        backgroundPosition: `-${monsters[monster.type].iconXY.x * 100}px -${monsters[monster.type].iconXY.y * 160}px`,
      }}
    />
    <div className={`card ${styles.statsCard}`}>
      <EntityBaseStats current={{health: monster.health, magic: monster.magic}} baseStats={monsterStats} />
    </div>
    {sameTeam && <div className={styles.partyOption}>
      <label htmlFor={`party-${monster.id}`}>In party</label>
      <Switch.Root
        id={`party-${monster.id}`}
        className={styles.partySwitch}
        checked={inParty}
        disabled={!canEditParty || savingParty}
        onCheckedChange={editParty}
      >
        <Switch.Thumb className={styles.partyThumb} />
      </Switch.Root>
    </div>}
    {error && <p role="alert">{error}</p>}
    <div>
      { canAttack && monster.health > 0 && (
        <button className="btn" onClick={onAttack}>
          Attack
        </button>
      ) }
    </div>
  </>;
};
