import Image from 'next/image';

import { monsters } from '@/lib/games/monsters';
import { characters } from '@/lib/games/characters';
import { MonsterState, PlayerState } from '@/lib/store/types';
import styles from './player-location-list.module.css';

export interface PlayerLocationListProps {
  player: PlayerState;
  otherPlayers: PlayerState[];
  monsters: MonsterState[];
}

interface IconDetail {
  key: string;
  name: string;
  icon: string;
  className: string;
  health: number;
  maxHealth: number;
}

export default function PlayerLocationList({
  player,
  otherPlayers,
  monsters: locationMonsters,
}: PlayerLocationListProps) {
  const iconDetails: IconDetail[] = [
    {
      key: player.id,
      name: player.name,
      icon: characters[player.id].icon,
      className: styles.self,
      health: player.health,
      maxHealth: player.baseStats?.health || player.health
    },
    ...otherPlayers.map(otherPlayer => ({
      key: otherPlayer.id,
      name: otherPlayer.name,
      icon: characters[otherPlayer.id].icon,
      className: styles.friendly,
      health: otherPlayer.health,
      maxHealth: otherPlayer.baseStats?.health || otherPlayer.health
    })),
    ...locationMonsters.map(monster => ({
      key: monster.key,
      name: monsters[monster.id].name,
      icon: monsters[monster.id].icon,
      className: styles.enemy,
      health: monster.health,
      maxHealth: monsters[monster.id].baseStats.health
    }))
  ];

  const getHealthClass = (iconDetail: IconDetail) => {
    if (iconDetail.health < iconDetail.maxHealth * 0.2) {
      return styles.critical;
    }
    else if (iconDetail.health < iconDetail.maxHealth * 0.5) {
      return styles.hurt;
    }
    return styles.healthy;
  }

  return (
    <ul>
      {iconDetails.map(iconDetail => (
        <li
          key={iconDetail.key}
          className={`${styles.entity} ${iconDetail.className}`}
        >
          <Image
            src={iconDetail.icon}
            width={53}
            height={80}
            loading="eager"
            alt={iconDetail.name}
          />

          { iconDetail.health < iconDetail.maxHealth &&
            <div
              className={`${styles.healthBar} ${getHealthClass(iconDetail)}`}
              style={{ height: `${100 * iconDetail.health / iconDetail.maxHealth}%` }}
            ></div> }
        </li>
      ))}
    </ul>
  );
}
