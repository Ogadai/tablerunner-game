import styles from './npc-card.module.css';
import { INamedTarget } from '@/lib/store/types';
import EntityBaseStats from './entity-base-stats';

export default function NpcCard({
  npc,
}: {
  npc: INamedTarget,
}) {
  return <>
    <div className={`card ${styles.statsCard}`}>
      <EntityBaseStats current={{health: npc.health}} baseStats={npc.baseStats!} />
    </div>
  </>;
};
