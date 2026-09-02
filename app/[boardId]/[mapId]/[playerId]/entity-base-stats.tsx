import { BaseStats } from "@/lib/games/types";
import styles from './entity-base-stats.module.css';

export default function EntityBaseStats({ health, baseStats }: { health: number, baseStats: BaseStats }) {
  const getHealthClass = () => {
    if (health < baseStats.health * 0.2) {
      return styles.critical;
    }
    else if (health < baseStats.health * 0.5) {
      return styles.hurt;
    }
    return styles.healthy;
  }

  const healthClass = getHealthClass();

  return (<>
    <table className={styles.statsTable}>
      <tr>
        <th>Health</th>
        <td>
          {health < baseStats.health ? `${health}/${baseStats.health}` : `${health}` } 

          { health < baseStats.health &&
            <div className={styles.healthBarBorder}>
              <div
                className={`${styles.healthBar} ${healthClass}`}
                style={{ width: `${100 * health / baseStats.health}%` }}
              ></div>
            </div>
          }
        </td>
      </tr>
      <tr><th>Attack</th><td>{baseStats.attack}</td></tr>
      <tr><th>Defence</th><td>{baseStats.defence}</td></tr>
      <tr><th>Damage</th><td>{baseStats.damage}</td></tr>
      <tr><th>Magic</th><td>{baseStats.magic}</td></tr>
    </table>
  </>);
};
