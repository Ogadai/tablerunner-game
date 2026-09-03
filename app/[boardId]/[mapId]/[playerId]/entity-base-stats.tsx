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

  const getStat = (statName: keyof BaseStats) => {
    const statValue = baseStats[statName] as number;
    const bonusValue = (baseStats.bonuses && baseStats.bonuses[statName] as number) || 0;

    const formattedStat = (statName === 'health')
      ? (health < baseStats.health ? `${health}/${baseStats.health}` : `${health}`)
      : `${statValue - bonusValue}`;

    const formattedBonus = `${bonusValue > 0 ? '+' : ''}${bonusValue}`;

    return <>
      <span>{ formattedStat }</span>
      <span className={ `${styles.statBonus} ${(bonusValue < 0) ? styles.statNegative : styles.statPositive}` }>
        { bonusValue !== 0 && formattedBonus }
      </span>
    </>;
  }

  return (<>
    <table className={styles.statsTable}><tbody>
      <tr>
        <th>Health</th>
        <td>
          {getStat('health')}

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
      <tr><th>Attack</th><td>{getStat('attack')}</td></tr>
      <tr><th>Defence</th><td>{getStat('defence')}</td></tr>
      <tr><th>Speed</th><td>{getStat('speed')}</td></tr>
      <tr><th>Damage</th><td>{getStat('damage')}</td></tr>
      <tr><th>Magic</th><td>{getStat('magic')}</td></tr>
    </tbody></table>
  </>);
};
