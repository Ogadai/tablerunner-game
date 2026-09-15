import styles from './npc-card.module.css';
import { INamedTarget } from '@/lib/store/types';
import EntityBaseStats from './entity-base-stats';
import { getNamedTargetStats } from '@/lib/store/playerStats';

export default function NpcCard({
  npc,
}: {
  npc: INamedTarget,
}) {
  const npcStats = getNamedTargetStats(npc.baseStats!, npc);

  return <>
    <div className={`card ${styles.statsCard}`}>
      <EntityBaseStats current={{health: npc.health}} baseStats={npcStats} />
    </div>
  </>;
};
