import styles from './npc-card.module.css';
import { NPCState, PlayerState } from '@/lib/store/types';
import CharacterAttributeTable from './character-attribute-table';
import EntityBaseStats from './entity-base-stats';
import { getCharacterBaseStats, getNamedTargetStats } from '@/lib/store/playerStats';
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
  const rawBaseStats = npc.characterStats
    ? getCharacterBaseStats(npc.characterStats, npc)
    : npc.baseStats!;
  const npcStats = getNamedTargetStats(rawBaseStats, npc);
  const isHireable = npc.masterId === null && !npc.team;
  const canHire = isHireable && player.coins >= npc.hireCost && npc.health > 0 && player.health > 0;

  const onHire = async () => {
    const response = await hireNpc(boardId, mapId, player.id, npc.id);
    if (response.success) {
      playerStatsSyncService.updateInventory(response.data);
      onHired();
    }
  };

  return <>
    {isHireable && <div className={styles.npcHeader}>
      <button type="button" className={`btn ${styles.hireButton}`} disabled={!canHire} onClick={onHire}>
        {npc.hireCost > 0
          ? <><span>Hire for</span><CoinDisplay coins={npc.hireCost} inline className={styles.hireCoins} /></>
          : 'Hire'}
      </button>
    </div>}
    {npc.characterStats && <div className={`card ${styles.statsCard}`}>
      <CharacterAttributeTable characterStats={npc.characterStats} />
    </div>}
    <div className={`card ${styles.statsCard}`}>
      <EntityBaseStats current={{health: npc.health, ...(npc.characterStats ? { magic: npc.magic } : {})}} baseStats={npcStats} />
    </div>
  </>;
};
