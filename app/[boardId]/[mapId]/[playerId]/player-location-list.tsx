import { monsters } from '@/lib/games/monsters';
import { characters } from '@/lib/games/characters';
import { MonsterState, PlayerState } from '@/lib/store/types';
import styles from './player-location-list.module.css';
import EntityList, { EntityItemDetail, EntityItemClass } from './entity-list';

export interface PlayerLocationListProps {
  player: PlayerState;
  otherPlayers: PlayerState[];
  monsters: MonsterState[];
}

export default function PlayerLocationList({
  player,
  otherPlayers,
  monsters: locationMonsters,
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

  return (
    <EntityList entities={entities} />
  );
}
