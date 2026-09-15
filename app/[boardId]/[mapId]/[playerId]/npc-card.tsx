import styles from './npc-card.module.css';
import { NPCState, PlayerState } from '@/lib/store/types';
import EntityBaseStats from './entity-base-stats';
import { getNamedTargetStats } from '@/lib/store/playerStats';
import CoinDisplay from './coin-display';
import { hireNpc } from '@/lib/store/playerInventory';
import playerStatsSyncService from './player-stats-sync.service';

export default function NpcCard({
  boardId,
  mapId,
  npc,
  player,
  onHired,
}: {
  boardId: string;
  mapId: string;
  npc: NPCState;
  player: PlayerState;
  onHired: () => void;
}) {
  const npcStats = getNamedTargetStats(npc.baseStats!, npc);
  const canHire = npc.masterId === null && player.coins >= npc.hireCost && player.health > 0;

  const onHire = async () => {
    const response = await hireNpc(boardId, mapId, player.id, npc.id);
    if (response.success) {
      playerStatsSyncService.updateInventory(response.data);
      onHired();
    }
  };

  return <>
    <div className={styles.npcHeader}>
      <CoinDisplay coins={npc.hireCost} />
    </div>
    <div className={`card ${styles.statsCard}`}>
      <EntityBaseStats current={{health: npc.health}} baseStats={npcStats} />
    </div>
    {npc.masterId === null && <div className={styles.npcButtons}>
      <button type="button" className="btn" disabled={!canHire} onClick={onHire}>Hire</button>
    </div>}
  </>;
};
