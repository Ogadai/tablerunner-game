'use client';

import { startTransition, useActionState, useEffect, useOptimistic, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { monsters } from '@/lib/games/monsters';
import { getMonsterName, type MonsterState, type PlayerState } from '@/lib/store/types';
import { warlordEditParty } from '@/lib/runner/warlords-of-fire/server-actions';
import EntityList, { EntityItemClass, type EntityItemDetail } from '../entity-list';
import styles from './warlord-party.module.css';

interface PartyChange {
  monsterId: string;
  monsterName: string;
  inParty: boolean;
  context: string;
  requestId: number;
}

interface PartySaveState {
  context: string;
  errors: Record<string, string>;
}

export default function WarlordParty({
  boardId,
  mapId,
  turn,
  player,
  locationMonsters,
  processing,
  onPartyChanged,
}: {
  boardId: string;
  mapId: string;
  turn: number;
  player: PlayerState;
  locationMonsters: MonsterState[];
  processing: boolean;
  onPartyChanged: (monsterId: string, inParty: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const requestId = useRef(0);
  const onPartyChangedRef = useRef(onPartyChanged);
  const disabled = processing || player.health <= 0;
  const context = JSON.stringify([boardId, mapId, turn, player.id, player.location.id, player.team, disabled]);
  const [optimisticMonsters, moveOptimistically] = useOptimistic(locationMonsters, (current, change: PartyChange) => {
    if (change.context !== context) return current;
    return current.map(monster => monster.id === change.monsterId && (!monster.masterId || monster.masterId === player.id)
      ? { ...monster, masterId: change.inParty ? player.id : undefined } : monster);
  });
  const availableMonsters = optimisticMonsters.filter(monster => player.team !== null
    && monster.team === player.team && monster.health > 0 && monster.location === player.location.id
    && (!monster.masterId || monster.masterId === player.id));

  useEffect(() => {
    onPartyChangedRef.current = onPartyChanged;
  }, [onPartyChanged]);

  useEffect(() => {
    return () => { requestId.current += 1; };
  }, [context]);

  const [saveState, saveParty, isPending] = useActionState<PartySaveState, PartyChange>(async (previous, change) => {
    if (change.requestId !== requestId.current) return previous;
    const errors = previous.context === change.context ? { ...previous.errors } : {};

    try {
      const result = await warlordEditParty(boardId, mapId, player.id, change.monsterId, change.inParty);
      if (change.requestId !== requestId.current) return previous;
      if (result.success) {
        delete errors[change.monsterId];
        startTransition(() => onPartyChangedRef.current(change.monsterId, change.inParty));
      } else {
        errors[change.monsterId] = `${change.monsterName}: ${result.error || 'Unable to update party.'}`;
      }
    } catch (error) {
      if (change.requestId !== requestId.current) return previous;
      errors[change.monsterId] = `${change.monsterName}: ${error instanceof Error ? error.message : 'Unable to update party.'}`;
    }

    return { context: change.context, errors };
  }, { context, errors: {} });
  const error = saveState.context === context ? Object.values(saveState.errors).join(' ') : '';

  const editParty = (entity: EntityItemDetail) => {
    if (disabled) return;
    const monster = availableMonsters.find(monster => monster.id === entity.id);
    if (!monster) return;
    const change: PartyChange = {
      monsterId: monster.id,
      monsterName: getMonsterName(monster),
      inParty: monster.masterId !== player.id,
      context,
      requestId: requestId.current,
    };

    startTransition(() => {
      // Apply every click immediately, even while earlier saves are queued.
      moveOptimistically(change);
      saveParty(change);
    });
  };

  const getEntities = (inParty: boolean): EntityItemDetail[] => availableMonsters
    .filter(monster => (monster.masterId === player.id) === inParty)
    .map(monster => ({
      id: monster.id,
      name: getMonsterName(monster),
      iconXY: monsters[monster.type].iconXY,
      className: EntityItemClass.friendly,
      health: monster.health,
      maxHealth: monsters[monster.type].baseStats.health,
    }));

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        {availableMonsters.length > 0 &&
          <button type="button" disabled={processing || player.health <= 0}>Party</button>
        }
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className="DialogContent">
          <Dialog.Title className="DialogTitle">Warlord&apos;s party</Dialog.Title>
          <div className={styles.partyContent} aria-busy={isPending}>
            {[true, false].map(inParty => (
              <section key={String(inParty)} className={styles.partyRow} aria-label={inParty ? 'Party' : 'Garrison'}>
                <div className={styles.rowLabel}>
                  <h4>{inParty ? 'In party' : `At location ${player.location.id}`}</h4>
                </div>
                <div className={styles.monsters}>
                  <EntityList entities={getEntities(inParty)} onClickEntity={disabled ? undefined : editParty} />
                </div>
              </section>
            ))}
            {isPending && <p role="status" className={styles.statusMessage}>Saving...</p>}
            {!isPending && error && <p role="alert" className={styles.statusMessage}>{error}</p>}
          </div>
          <Dialog.Close className="DialogClose btn-secondary material-symbols-outlined" aria-label="Close">close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
