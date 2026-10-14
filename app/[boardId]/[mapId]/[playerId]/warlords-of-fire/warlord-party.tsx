'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Dialog } from 'radix-ui';
import { monsters } from '@/lib/games/monsters';
import { getMonsterName, type MonsterState, type PlayerState } from '@/lib/store/types';
import { warlordEditParty } from '@/lib/runner/warlords-of-fire/server-actions';
import EntityList, { EntityItemClass, type EntityItemDetail } from '../entity-list';
import styles from './warlord-party.module.css';

export default function WarlordParty({
  boardId,
  mapId,
  player,
  locationMonsters,
  processing,
  onPartyChanged,
}: {
  boardId: string;
  mapId: string;
  player: PlayerState;
  locationMonsters: MonsterState[];
  processing: boolean;
  onPartyChanged: (monsterId: string, inParty: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);
  const requestId = useRef(0);
  const disabled = processing || isPending || player.health <= 0;
  const availableMonsters = locationMonsters.filter(monster => player.team !== null
    && monster.team === player.team && monster.health > 0 && monster.location === player.location.id
    && (!monster.masterId || monster.masterId === player.id));

  useEffect(() => {
    return () => { requestId.current += 1; };
  }, [boardId, mapId, player, locationMonsters]);

  const editParty = (entity: EntityItemDetail) => {
    if (disabled || saving.current) return;
    const monster = availableMonsters.find(monster => monster.id === entity.id);
    if (!monster) return;
    const inParty = monster.masterId !== player.id;
    saving.current = true;
    const currentRequest = ++requestId.current;
    setError(null);

    startTransition(async () => {
      try {
        const result = await warlordEditParty(boardId, mapId, player.id, monster.id, inParty);
        if (currentRequest !== requestId.current) return;
        if (!result.success) throw new Error(result.error || 'Unable to update party.');
        onPartyChanged(monster.id, inParty);
      } catch (error) {
        if (currentRequest === requestId.current) setError((error as Error).message);
      } finally {
        saving.current = false;
      }
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
          <Dialog.Title className="DialogTitle">Warlord's party</Dialog.Title>
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
            {error && <p role="alert" className={styles.statusMessage}>{error}</p>}
          </div>
          <Dialog.Close className="DialogClose btn-secondary material-symbols-outlined" aria-label="Close">close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
