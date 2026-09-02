import { monsters } from '@/lib/games/monsters';
import { characters } from '@/lib/games/characters';
import { addPlayerAction, getPlayerActionsState, removePlayerAction } from "@/lib/store/playerActionsState";
import { MonsterState, PlayerAction, PlayerActionAttack, PlayerActionsState, PlayerActionType, PlayerState } from '@/lib/store/types';
import styles from './player-location-list.module.css';
import EntityList, { EntityItemDetail, EntityItemClass } from './entity-list';

export interface PlayerLocationListProps {
  player: PlayerState;
  otherPlayers: PlayerState[];
  monsters: MonsterState[];
  addNewAction: (opts: Omit<PlayerAction, 'id'>) => Promise<void>;
}

export default function PlayerLocationList({
  player,
  otherPlayers,
  monsters: locationMonsters,
  addNewAction
}: PlayerLocationListProps) {
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
      await addNewAction({
        type: PlayerActionType.Attack,
        description: `Attack ${entity.name}`,
        target: entity.id
      } as Omit<PlayerActionAttack, 'id'>);
    }
  }

  return (
    <EntityList entities={entities} onClickEntity={onClickEntity} />
  );
}
