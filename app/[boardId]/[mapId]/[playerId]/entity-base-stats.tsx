import { BaseStats } from "@/lib/games/types";
import styles from './entity-base-stats.module.css';

export default function EntityBaseStats({
  current,
  baseStats,
  statsList
}: {
  current: { health?: number, magic?: number },
  baseStats: BaseStats,
  statsList?: string[]
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

  const showStat = (name: string) => !statsList || statsList.includes(name);

  return (<>
    <table className={styles.statsTable}><tbody>
      { showStat('health') && (<tr>
        <th>Health</th>
        <td>
          {getStat('health')}

          { (current.health || 0) < baseStats.health &&
            <div className={styles.statBarBorder}>
              <div
                className={`${styles.statBar} ${getStatBarClass('health')}`}
                style={{ width: `${100 * (current.health || 0) / baseStats.health}%` }}
              ></div>
            </div>
          }
        </td>
      </tr>) }
      { showStat('attack') && (<tr><th>Attack</th><td>{getStat('attack')}</td></tr>) }
      { showStat('defence') && (<tr><th>Defence</th><td>{getStat('defence')}</td></tr>) }
      { showStat('speed') && (<tr><th>Speed</th><td>{getStat('speed')}</td></tr>) }
      { showStat('damage') && (<tr><th>Damage</th><td>{getStat('damage')}</td></tr>) }
      { showStat('magic') && (<tr><th>Magic</th><td>
        {getStat('magic')}
        
        { current.magic && current.magic < baseStats.magic &&
          <div className={styles.statBarBorder}>
            <div
              className={`${styles.statBar} ${getStatBarClass('magic')}`}
              style={{ width: `${100 * current.magic / baseStats.magic}%` }}
            ></div>
          </div>
        }
      </td></tr>) }
    </tbody></table>
  </>);
};
