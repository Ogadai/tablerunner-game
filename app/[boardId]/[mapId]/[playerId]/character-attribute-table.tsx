import { CharacterStats as CharacterStatsType } from '@/lib/games/types';
import styles from './character-stats.module.css';
import statsStyles from './entity-base-stats.module.css';

const CHARACTER_STAT_ROWS: [string, keyof CharacterStatsType, string[]][] = [
  ['Strength', 'strength', [styles.swordIcon, styles.shieldIcon]],
  ['Skill', 'skill', [styles.bowIcon, styles.shieldIcon]],
  ['Intelligence', 'intelligence', [styles.magicIcon]],
  ['Resilience', 'resiliance', [styles.healthIcon]],
  ['Reactions', 'reactions', [styles.speedIcon, styles.shieldIcon]],
];

export default function CharacterAttributeTable({
  characterStats,
  addedStats,
  editable = false,
  availablePoints = 0,
  onUpdateStat,
}: {
  characterStats: CharacterStatsType;
  addedStats?: Partial<CharacterStatsType>;
  editable?: boolean;
  availablePoints?: number;
  onUpdateStat?: (stat: keyof CharacterStatsType, change: number) => void;
}) {
  return (
    <table className={statsStyles.statsTable}><tbody>
      {CHARACTER_STAT_ROWS.map(([label, stat, icons]) => {
        const extraPoints = addedStats?.[stat] || 0;

        return <tr key={stat}>
          <th>{label}</th>
          <td className={styles.statIconColumn}>{icons.map(icon =>
            <span key={icon} className={`${styles.statIcon} ${icon}`}></span>
          )}</td>
          {editable && <td className={styles.statActions}>
            <button
              type="button"
              className={styles.statButton}
              style={{ visibility: extraPoints > 0 ? 'visible' : 'hidden' }}
              onClick={() => onUpdateStat?.(stat, -1)}
              aria-label={`Decrease ${label}`}
            >-</button>
          </td>}
          <td className={styles.characterStat}>{characterStats[stat] + extraPoints}</td>
          {editable && <td className={styles.statActions}>
            <button
              type="button"
              className={styles.statButton}
              style={{ visibility: availablePoints > 0 ? 'visible' : 'hidden' }}
              onClick={() => onUpdateStat?.(stat, 1)}
              aria-label={`Increase ${label}`}
            >+</button>
          </td>}
        </tr>;
      })}
    </tbody></table>
  );
}
