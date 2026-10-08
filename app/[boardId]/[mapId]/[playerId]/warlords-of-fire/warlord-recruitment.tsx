'use client';

import { startTransition, useEffect, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { monsters } from '@/lib/games/monsters';
import { GameState } from '@/lib/store/types';
import { getMonsterCost, getWarlordAvailableMonsters } from '@/lib/runner/warlords-of-fire/recruit-helper';
import { getPlayerWarlordInstructions, warlordRecruitCancel, warlordRecruitMonster } from '@/lib/runner/warlords-of-fire/server-actions';
import { WarlordInstructionRecruit } from '@/lib/runner/warlords-of-fire/warlords-types';
import EntityList, { EntityItemClass, EntityItemDetail } from '../entity-list';
import styles from './warlord-recruitment.module.css';

function getMonsterEntity(monsterType: string, id: string, availableCoins: number): EntityItemDetail {
  const monster = monsters[monsterType];
  const cost = getMonsterCost(monsterType);
  return {
    id,
    name: monster.name,
    iconXY: monster.iconXY,
    className: EntityItemClass.friendly,
    health: monster.baseStats.health,
    maxHealth: monster.baseStats.health,
    cost,
    costUnaffordable: cost > availableCoins,
  };
}

export default function WarlordRecruitment({
  boardId,
  mapId,
  playerId,
  gameState,
  availableCoins,
  processing,
}: {
  boardId: string;
  mapId: string;
  playerId: string;
  gameState: GameState;
  availableCoins: number;
  processing: boolean;
}) {
  const [queue, setQueue] = useState<WarlordInstructionRecruit[] | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isRecruiting, setIsRecruiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recruitmentPending = useRef(false);
  const requestId = useRef(0);
  const availableMonsters = [...new Set(getWarlordAvailableMonsters(gameState, playerId))];
  const queueEntities = (queue ?? []).reduce<{ entities: EntityItemDetail[]; cost: number }>(
    (result, recruit, index) => {
      const entity = getMonsterEntity(recruit.monster, `recruit-${recruit.recruitId ?? index}`, availableCoins);
      const cost = result.cost + (entity.cost ?? 0);
      return {
        entities: [...result.entities, { ...entity, costUnaffordable: cost > availableCoins }],
        cost,
      };
    },
    { entities: [], cost: 0 },
  ).entities;

  useEffect(() => {
    let active = true;
    const currentRequest = ++requestId.current;

    async function loadQueue() {
      try {
        const result = await getPlayerWarlordInstructions(boardId, mapId, playerId);
        if (!active || currentRequest !== requestId.current) return;
        if (!result.success) throw new Error(result.error || 'Unable to load recruitment queue.');
        setQueue(result.data?.recruit ?? []);
        setError(null);
      } catch (error) {
        if (active && currentRequest === requestId.current) {
          setError((error as Error).message);
        }
      }
    }

    void loadQueue();
    return () => { active = false; };
  }, [boardId, mapId, playerId, gameState]);

  const recruitMonster = async (entity: EntityItemDetail) => {
    if (processing || recruitmentPending.current || !availableMonsters.includes(entity.id)) return;
    recruitmentPending.current = true;
    const currentRequest = ++requestId.current;
    setIsRecruiting(true);
    setError(null);

    try {
      const result = await warlordRecruitMonster(boardId, mapId, playerId, { monster: entity.id });
      if (currentRequest !== requestId.current) return;
      if (!result.success || !result.data) throw new Error(result.error || 'Unable to recruit monster.');
      setQueue(result.data.recruit);
      setIsOpen(false);
    } catch (error) {
      if (currentRequest === requestId.current) setError((error as Error).message);
    } finally {
      recruitmentPending.current = false;
      setIsRecruiting(false);
    }
  };

  const cancelRecruit = async (entity: EntityItemDetail) => {
    if (processing || recruitmentPending.current) return;
    const recruit = queue?.find(entry => `recruit-${entry.recruitId}` === entity.id);
    if (recruit?.recruitId === undefined) return;
    recruitmentPending.current = true;
    const currentRequest = ++requestId.current;
    setIsRecruiting(true);
    setError(null);

    try {
      const result = await warlordRecruitCancel(boardId, mapId, playerId, recruit.recruitId);
      if (currentRequest !== requestId.current) return;
      if (!result.success || !result.data) throw new Error(result.error || 'Unable to cancel recruitment.');
      setQueue(result.data.recruit);
    } catch (error) {
      if (currentRequest === requestId.current) setError((error as Error).message);
    } finally {
      recruitmentPending.current = false;
      setIsRecruiting(false);
    }
  };

  return (
    <section className={styles.recruitment} aria-label="Recruitment queue">
      { (queue?.length || 0) > 0 && <h4>Recruitment queue</h4> }
      <EntityList
        entities={queueEntities}
        onClickEntity={entity => startTransition(() => cancelRecruit(entity))}
        clickDisabled={processing || isRecruiting}
        showDeleteIcon={true}
      />
      {!isOpen && error && <p role="alert">{error}</p>}
      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Trigger asChild>
          {(queue === null && !error) 
          ? <p>Loading recruitment queue...</p>
          : <button type="button" disabled={processing || isRecruiting}>Recruit</button>
          }
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="DialogOverlay" />
          <Dialog.Content className="DialogContent">
            <Dialog.Title className="DialogTitle">Recruit</Dialog.Title>
            <div className={styles.recruitContent}>
              <EntityList
                entities={availableMonsters.map(monster => getMonsterEntity(monster, monster, availableCoins))}
                onClickEntity={processing || isRecruiting ? undefined : recruitMonster}
              />
              {availableMonsters.length === 0 && <p>No monsters available to recruit.</p>}
              {isRecruiting && <p role="status" className={styles.statusMessage}>Recruiting...</p>}
              {error && <p role="alert" className={styles.statusMessage}>{error}</p>}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
