import { BaseStats } from "@/lib/games/types";
import styles from './entity-base-stats.module.css';

export default function EntityBaseStats({
  current,
  baseStats
}: {
  current: { health: number, magic?: number },
  baseStats: BaseStats
}) {
  const getStatBarClass = (statName: keyof BaseStats) => {
    const currentValue = (current as any)[statName] as number;
    if (currentValue < baseStats.health * 0.2) {
      return styles.critical;
    }
    else if (currentValue < baseStats.health * 0.5) {
      return styles.hurt;
    }
    return styles.healthy;
  }

  const getStat = (statName: keyof BaseStats) => {
    const statValue = baseStats[statName] as number;
    const bonusValue = (baseStats.bonuses && baseStats.bonuses[statName] as number) || 0;
    
    const currentValue = (current as any)[statName] as number;

    const formattedStat = ((current as any)[statName] !== undefined)
      ? (currentValue < statValue ? `${currentValue}/${statValue}` : `${currentValue}`)
      : `${statValue}`;

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

          { current.health < baseStats.health &&
            <div className={styles.statBarBorder}>
              <div
                className={`${styles.statBar} ${getStatBarClass('health')}`}
                style={{ width: `${100 * current.health / baseStats.health}%` }}
              ></div>
            </div>
          }
        </td>
      </tr>
      <tr><th>Attack</th><td>{getStat('attack')}</td></tr>
      <tr><th>Defence</th><td>{getStat('defence')}</td></tr>
      <tr><th>Speed</th><td>{getStat('speed')}</td></tr>
      <tr><th>Damage</th><td>{getStat('damage')}</td></tr>
      <tr><th>Magic</th><td>
        {getStat('magic')}
        
        { current.magic && current.magic < baseStats.magic &&
          <div className={styles.statBarBorder}>
            <div
              className={`${styles.statBar} ${getStatBarClass('magic')}`}
              style={{ width: `${100 * current.magic / baseStats.magic}%` }}
            ></div>
          </div>
        }
      </td></tr>
    </tbody></table>
  </>);
};
