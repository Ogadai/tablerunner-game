import { useState } from "react";
import Image from 'next/image';
import { Dialog } from "radix-ui";
import { monsters } from '@/lib/games/monsters';
import { characters } from '@/lib/games/characters';
import { MonsterState, PlayerAction, PlayerActionAttack, PlayerActionsState, PlayerActionType, PlayerState } from '@/lib/store/types';
import styles from './player-location-list.module.css';
import EntityList, { EntityItemDetail, EntityItemClass } from './entity-list';
import EntityBaseStats from './entity-base-stats';

export interface PlayerLocationListProps {
  player: PlayerState;
  otherPlayers: PlayerState[];
  monsters: MonsterState[];
  actionsState: PlayerActionsState;
  addNewAction: (opts: Omit<PlayerAction, 'id'>) => Promise<void>;
}

export default function PlayerLocationList({
  player,
  otherPlayers,
  monsters: locationMonsters,
  actionsState,
  addNewAction
}: PlayerLocationListProps) {
  const [monsterOpen, setMonsterOpen] = useState<MonsterState | null>(null);

  const entities: EntityItemDetail[] = [
    {
      id: player.id,
      name: player.name,
      icon: characters[player.id].icon,
      className: EntityItemClass.self,
      health: player.health,
      maxHealth: player.baseStats?.health || player.health
    },
    ...otherPlayers.map(otherPlayer => ({
      id: otherPlayer.id,
      name: otherPlayer.name,
      icon: characters[otherPlayer.id].icon,
      className: EntityItemClass.friendly,
      health: otherPlayer.health,
      maxHealth: otherPlayer.baseStats?.health || otherPlayer.health
    })),
    ...locationMonsters.map(monster => ({
      id: monster.id,
      name: monsters[monster.type].name,
      icon: monsters[monster.type].icon,
      className: EntityItemClass.enemy,
      health: monster.health,
      maxHealth: monsters[monster.type].baseStats.health
    }))
  ];
  
  const onClickEntity = async (entity: EntityItemDetail) => {
    if (entity.className === EntityItemClass.enemy) {
      const monster = locationMonsters.find(m => m.id === entity.id)!;
      setMonsterOpen(monster);
    }
  }

  const onAttackMonster = async (monster: MonsterState) => {
    setMonsterOpen(null);

    await addNewAction({
      type: PlayerActionType.Attack,
      description: `Attack ${monsters[monster.type].name}`,
      target: monster.id
    } as Omit<PlayerActionAttack, 'id'>);
  }

  const isAttackingEntity = (monster: MonsterState | null): boolean =>
    !!monster && actionsState.actions.some(a =>
      a.type === PlayerActionType.Attack
      && (a as PlayerActionAttack).target === monster.id
    );

  return (<>
    <EntityList entities={entities} onClickEntity={onClickEntity} />

    <Dialog.Root open={monsterOpen !== null} onOpenChange={open => { if (!open) setMonsterOpen(null) }}>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className="DialogContent">
          <Dialog.Title className="DialogTitle">{monsterOpen ? monsters[monsterOpen.type].name : ""}</Dialog.Title>
            { monsterOpen && <Image
              className={styles.monsterImage}
              src={monsters[monsterOpen.type].image}
              width={256}
              height={384}
              loading="eager"
              alt={monsters[monsterOpen.type].name}
            /> }
            { monsterOpen && 
              <div className={`card ${styles.statsCard}`}>
                <EntityBaseStats health={monsterOpen.health} baseStats={monsters[monsterOpen.type].baseStats} />
              </div>
            }
          <div>
            { !isAttackingEntity(monsterOpen) && (
              <button className="btn" onClick={() => monsterOpen && onAttackMonster(monsterOpen)}>
                Attack
              </button>
            ) }
          </div>
          <Dialog.Close className="DialogClose btn-secondary material-symbols-outlined" aria-label="Close">close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>);
}
