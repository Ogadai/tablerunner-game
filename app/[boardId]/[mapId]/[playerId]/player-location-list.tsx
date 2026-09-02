import { useState } from "react";
import Image from 'next/image';
import { Dialog } from "radix-ui";
import { monsters } from '@/lib/games/monsters';
import { characters } from '@/lib/games/characters';
import { MonsterState, PlayerAction, PlayerActionAttack, PlayerActionsState, PlayerActionType, PlayerState } from '@/lib/store/types';
import styles from './player-location-list.module.css';
import EntityList, { EntityItemDetail, EntityItemClass } from './entity-list';
import MonsterCard from './monster-card';
import CharacterCard from './character-card';

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
  const [characterOpen, setCharacterOpen] = useState<PlayerState | null>(null);

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
    } else if (player.id === entity.id) {
      setCharacterOpen(player);
    } else {
      setCharacterOpen(otherPlayers.find(p => p.id === entity.id)!);
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

  const dialogOpen = (monsterOpen !== null) || (characterOpen !== null);
  const dialogTitle =  (monsterOpen !== null)
    ? monsters[monsterOpen.type].name
    : (characterOpen !== null) ? characterOpen.name : '';
  const onCloseDialog = () => {
    setMonsterOpen(null);
    setCharacterOpen(null);
  }

  return (<>
    <EntityList entities={entities} onClickEntity={onClickEntity} />

    <Dialog.Root open={dialogOpen} onOpenChange={open => { if (!open) onCloseDialog() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className="DialogContent">
          <Dialog.Title className="DialogTitle">{dialogTitle}</Dialog.Title>
          <div className="DialogContentBody">
            { monsterOpen &&
              <MonsterCard
                monster={monsterOpen}
                isAttacking={isAttackingEntity(monsterOpen)}
                onAttack={() => onAttackMonster(monsterOpen)}
              ></MonsterCard>
            }
            { characterOpen &&
              <CharacterCard
                player={characterOpen}
              ></CharacterCard>
            }
          </div>
          <Dialog.Close className="DialogClose btn-secondary material-symbols-outlined" aria-label="Close">close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>);
}
