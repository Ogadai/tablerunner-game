'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import QuestsTopicService from '@/app/message-bus/quests-topic-service';
import { getCellCoordinates } from '@/lib/games/gridCells';
import { allItems } from '@/lib/games/items';
import { getGameTopicId } from '@/lib/message-types';
import { canClaimItemQuestTurnIn, getQuestsState, isPlayerEligibleForQuest } from '@/lib/runner/cauldron-of-fire/quests';
import { QuestInstance } from '@/lib/runner/cauldron-of-fire/quest-types';
import { acceptCauldronQuest, claimCauldronQuestReward } from '@/lib/runner/cauldron-of-fire/server-actions';
import { getCombatStats } from '@/lib/store/playerStats';
import { GameState, NPCState, PlayerState } from '@/lib/store/types';
import gameStateLightingService from '@/app/[boardId]/[mapId]/game/game-state-lighting-service';
import CoinDisplay from '../coin-display';
import playerStatsSyncService from '../player-stats-sync.service';
import usePlayerStatsSnapshot from '../use-player-stats-snapshot';
import styles from './cauldron-quests.module.css';

interface CauldronQuestsProps {
  boardId: string;
  mapId: string;
  playerId?: string;
  player?: PlayerState;
  sourcePlayer?: PlayerState;
  gameState: GameState;
  processing?: boolean;
}

export function getCompassHint(fromLocation: number, toLocation: number): string {
  if (fromLocation === toLocation) return 'Here';
  const from = getCellCoordinates(fromLocation);
  const to = getCellCoordinates(toLocation);
  if (from.row < 0 || to.row < 0) return '';

  const dRow = to.row - from.row;
  const dCol = to.col - from.col;
  const vertical = dRow > 0 ? 'N' : dRow < 0 ? 'S' : '';
  const horizontal = dCol > 0 ? 'E' : dCol < 0 ? 'W' : '';
  return `${vertical}${horizontal}`;
}

export function formatLocations(
  locations: number[] | undefined,
  fromLocation?: number,
): string {
  const locs = locations || [];
  const prefix = locs.length === 1 ? 'Location' : 'Locations';
  if (locs.length === 0) return prefix;
  const formatted = locs
    .map(loc => {
      const dir = fromLocation !== undefined ? getCompassHint(fromLocation, loc) : '';
      return `${loc}${dir ? ` (${dir})` : ''}`;
    })
    .join(', ');
  return `${prefix} ${formatted}`;
}

export default function CauldronQuests({
  boardId,
  mapId,
  playerId,
  player: playerProp,
  sourcePlayer: sourcePlayerProp,
  gameState,
  processing = false,
}: CauldronQuestsProps) {
  const [manualOpen, setManualOpen] = useState(false);
  const [dismissedArrivalKey, setDismissedArrivalKey] = useState<string | null>(null);
  const [submittingQuestId, setSubmittingQuestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveUpdate, setLiveUpdate] = useState<{
    gameState: GameState;
    quests: QuestInstance[];
    npcs: NPCState[];
  } | null>(null);
  const actionPending = useRef(false);

  const topicId = getGameTopicId(boardId, mapId);

  useEffect(() => {
    return QuestsTopicService.subscribe(topicId, message => {
      if (message.leds) {
        void gameStateLightingService.update(boardId, mapId, { ...gameState, leds: message.leds });
      }
      setLiveUpdate({
        gameState,
        quests: message.quests,
        npcs: message.npcs ?? gameState.npcs,
      });
    });
  }, [topicId, gameState, boardId, mapId]);

  const statsSnapshot = usePlayerStatsSnapshot();
  const targetPlayerId = playerProp?.id ?? playerId ?? '';
  const resolvedSourcePlayer = sourcePlayerProp ?? gameState.players.find(p => p.id === targetPlayerId);
  const player =
    playerProp ??
    (statsSnapshot.sourcePlayer === resolvedSourcePlayer && statsSnapshot.activePlayer
      ? statsSnapshot.activePlayer
      : resolvedSourcePlayer);

  if (!player) {
    return null;
  }

  const allQuests =
    liveUpdate && liveUpdate.gameState === gameState
      ? liveUpdate.quests
      : getQuestsState(gameState).quests;
  const currentNpcs =
    liveUpdate && liveUpdate.gameState === gameState ? liveUpdate.npcs : gameState.npcs;

  // Only show quests that are shared or assigned specifically to this character
  const availableHere = allQuests.filter(
    q =>
      q.status === 'available' &&
      q.offerLocation === player.location.id &&
      isPlayerEligibleForQuest(q, player.id),
  );

  const activeQuests = allQuests
    .filter(q => q.status === 'active' && isPlayerEligibleForQuest(q, player.id))
    .sort((a, b) => (b.isMainQuest ? 1 : 0) - (a.isMainQuest ? 1 : 0));

  const finishedQuests = allQuests.filter(
    q =>
      (q.status === 'completed' || q.status === 'failed') &&
      isPlayerEligibleForQuest(q, player.id),
  );

  const arrivalKey = `${gameState.turn}:${player.location.id}`;
  const shouldAutoOpen = player.health > 0 && availableHere.length > 0 && dismissedArrivalKey !== arrivalKey;
  const isOpen = manualOpen || shouldAutoOpen;

  const handleOpenChange = (nextOpen: boolean) => {
    setManualOpen(nextOpen);
    if (!nextOpen) {
      setDismissedArrivalKey(arrivalKey);
      setError(null);
    }
  };

  const handleAcceptQuest = async (questId: string) => {
    if (processing || actionPending.current || player.health <= 0) return;
    actionPending.current = true;
    setSubmittingQuestId(questId);
    setError(null);

    try {
      const response = await acceptCauldronQuest(boardId, mapId, player.id, questId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to accept quest.');
      }
      setLiveUpdate({
        gameState,
        quests: response.data.quests,
        npcs: response.data.npcs,
      });
      if (response.data.leds) {
        void gameStateLightingService.update(boardId, mapId, { ...gameState, leds: response.data.leds });
      }
      if (response.data.playerInventory) {
        playerStatsSyncService.updateInventory(response.data.playerInventory, resolvedSourcePlayer ?? player);
      }
      setManualOpen(true);
      setDismissedArrivalKey(arrivalKey);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      actionPending.current = false;
      setSubmittingQuestId(null);
    }
  };

  const handleClaimReward = async (questId: string) => {
    if (processing || actionPending.current || player.health <= 0) return;
    actionPending.current = true;
    setSubmittingQuestId(questId);
    setError(null);

    try {
      const response = await claimCauldronQuestReward(boardId, mapId, player.id, questId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to claim quest reward.');
      }
      setLiveUpdate({
        gameState,
        quests: response.data.quests,
        npcs: response.data.npcs,
      });
      if (response.data.leds) {
        void gameStateLightingService.update(boardId, mapId, { ...gameState, leds: response.data.leds });
      }
      if (response.data.playerInventory) {
        playerStatsSyncService.updateInventory(response.data.playerInventory, resolvedSourcePlayer ?? player);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      actionPending.current = false;
      setSubmittingQuestId(null);
    }
  };

  const renderObjectiveSummary = (quest: QuestInstance) => {
    switch (quest.category) {
      case 'retrieve_item': {
        const itemName = (quest.itemType && allItems[quest.itemType]?.name) || 'Quest Relic';
        const hasItem =
          player.equipment.some(
            i => i.id === quest.spawnedItemId || (!quest.spawnedItemId && i.type === quest.itemType),
          ) ||
          currentNpcs.some(
            n =>
              n.masterId === player.id &&
              n.health > 0 &&
              n.equipment.some(
                i => i.id === quest.spawnedItemId || (!quest.spawnedItemId && i.type === quest.itemType),
              ),
          );

        if (hasItem) {
          return `You have the ${itemName}! Return to ${formatLocations([quest.offerLocation], player.location.id)} to claim your reward.`;
        }
        return `Search ${formatLocations(quest.hintLocations, player.location.id)} for the ${itemName}, then bring it back to Location ${quest.offerLocation}.`;
      }

      case 'deliver_item': {
        const itemName = (quest.itemType && allItems[quest.itemType]?.name) || 'Quest Package';
        const dest = quest.destinationLocation ?? quest.offerLocation;
        return `Deliver the ${itemName} to ${formatLocations([dest], player.location.id)}.`;
      }

      case 'escort_npc': {
        const npc = currentNpcs.find(n => n.id === quest.spawnedNpcId);
        const dest = quest.destinationLocation ?? quest.offerLocation;
        const maxHp = npc?.baseStats ? getCombatStats(npc).health : npc?.health || 0;
        const hpInfo = npc ? ` (HP: ${npc.health}/${maxHp}, at Location ${npc.location.id})` : '';
        return `Escort ${quest.npcName || 'the traveller'}${hpInfo} safely to ${formatLocations([dest], player.location.id)}.`;
      }

      case 'rescue_npc': {
        const npc = currentNpcs.find(n => n.id === quest.spawnedNpcId);
        const dest = quest.destinationLocation ?? quest.offerLocation;
        if (quest.npcRescued || npc?.masterId) {
          const master = gameState.players.find(p => p.id === npc?.masterId);
          const maxHp = npc?.baseStats ? getCombatStats(npc).health : npc?.health || 0;
          const followerInfo = master ? ` following ${master.name}` : '';
          return `${quest.npcName || 'The captive'} (HP: ${npc?.health ?? 0}/${maxHp}${followerInfo}) is rescued! Escort them to ${formatLocations([dest], player.location.id)}.`;
        }
        return `Find ${quest.npcName || 'the captive'} in ${formatLocations(quest.hintLocations, player.location.id)}, then escort them back to Location ${dest}.`;
      }

      case 'clear_dungeon': {
        const targetLocs = quest.targetLocations || [];
        const firstTarget = targetLocs[0];
        const dir = firstTarget ? getCompassHint(player.location.id, firstTarget) : '';
        return `Clear all monsters in ${quest.areaName || 'the target area'} (${formatLocations(targetLocs)}${dir ? `, ${dir}` : ''}).`;
      }

      case 'slay_boss': {
        return `Track down and defeat ${quest.bossName || 'the boss monster'} in ${formatLocations(quest.hintLocations, player.location.id)}.`;
      }

      case 'scout_area': {
        const targetLocs = quest.targetLocations || [];
        const scouted = new Set(quest.scoutedLocations || []);
        const details = targetLocs
          .map(loc => {
            if (scouted.has(loc)) return `${loc} (Scouted)`;
            const dir = getCompassHint(player.location.id, loc);
            return `${loc}${dir ? ` (${dir})` : ''}`;
          })
          .join(', ');
        const prefix = targetLocs.length === 1 ? 'Location' : 'Locations';
        return `Visit ${prefix} (${scouted.size}/${targetLocs.length}): ${details}.`;
      }
    }
  };

  const renderRewardRow = (quest: QuestInstance) => {
    const rewardItemName = quest.reward.itemId ? allItems[quest.reward.itemId]?.name : undefined;
    return (
      <div className={styles.rewardRow}>
        <span className={styles.rewardLabel}>Reward:</span>
        <CoinDisplay coins={quest.reward.coins} />
        <span className={styles.rewardXp}>+{quest.reward.points} XP</span>
        {rewardItemName && <span className={styles.rewardItem}>+ {rewardItemName}</span>}
        <span className={styles.rewardScopeHint}>
          {quest.scope === 'shared'
            ? '(Coins & XP to all heroes; item to completer)'
            : '(Personal reward)'}
        </span>
      </div>
    );
  };

  const hasAvailableHere = availableHere.length > 0;

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={`btn material-symbols-outlined ${styles.questsTrigger} ${hasAvailableHere ? styles.questsTriggerAttention : ''}`}
          aria-label="Quests"
          title="Quests"
        >
          assignment
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className={`DialogContent ${styles.questsDialog}`}>
          <Dialog.Title className="DialogTitle">Quests</Dialog.Title>

          <div className={styles.dialogBody}>
            {error && (
              <div role="alert" className={styles.errorBanner}>
                {error}
              </div>
            )}

            {availableHere.length > 0 && (
              <section className={styles.section} aria-label="Available Quests at This Location">
                <h4 className={styles.sectionTitle}>
                  Available at Location {player.location.id} ({availableHere.length})
                </h4>
                <ul className={styles.questList}>
                  {availableHere.map(quest => (
                    <li key={quest.id} className={`${styles.questCard} ${styles.questCardAvailable}`}>
                      <div className={styles.questHeader}>
                        <span className={styles.questTitle}>{quest.title}</span>
                        <div className={styles.badges}>
                          <span
                            className={
                              quest.scope === 'shared'
                                ? styles.scopeBadgeShared
                                : styles.scopeBadgePlayer
                            }
                          >
                            {quest.scope === 'shared' ? 'Shared Quest' : 'Personal Quest'}
                          </span>
                        </div>
                      </div>
                      <p className={styles.questDesc}>{quest.description}</p>
                      <div className={styles.questFooter}>
                        {renderRewardRow(quest)}
                        <button
                          type="button"
                          className="btn"
                          disabled={processing || submittingQuestId !== null || player.health <= 0}
                          onClick={() => handleAcceptQuest(quest.id)}
                        >
                          {submittingQuestId === quest.id ? 'Accepting...' : 'Accept Quest'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className={styles.section} aria-label="Active Quests">
              <h4 className={styles.sectionTitle}>Active Quests ({activeQuests.length})</h4>
              {activeQuests.length === 0 ? (
                <div className={styles.emptyNotice}>
                  No active quests right now. Explore villages, taverns, and camps across the realm to discover quests!
                </div>
              ) : (
                <ul className={styles.questList}>
                  {activeQuests.map(quest => {
                    const canClaim =
                      isPlayerEligibleForQuest(quest, player.id) &&
                      canClaimItemQuestTurnIn(quest, player, currentNpcs);
                    return (
                      <li
                        key={quest.id}
                        className={`${styles.questCard} ${quest.isMainQuest ? styles.questCardMain : ''}`}
                      >
                        <div className={styles.questHeader}>
                          <span className={styles.questTitle}>
                            {quest.isMainQuest && (
                              <span
                                className={`material-symbols-outlined ${styles.mainQuestIcon}`}
                                aria-hidden="true"
                              >
                                crown
                              </span>
                            )}
                            {quest.title}
                          </span>
                          <div className={styles.badges}>
                            {quest.isMainQuest ? (
                              <span className={styles.scopeBadgeMain}>Main Story Quest</span>
                            ) : (
                              <span
                                className={
                                  quest.scope === 'shared'
                                    ? styles.scopeBadgeShared
                                    : styles.scopeBadgePlayer
                                }
                              >
                                {quest.scope === 'shared' ? 'Shared Quest' : 'Personal Quest'}
                              </span>
                            )}
                          </div>
                        </div>
                        {!quest.isMainQuest && <p className={styles.questDesc}>{quest.description}</p>}
                        <div className={styles.objectiveBox}>{renderObjectiveSummary(quest)}</div>
                        {(!quest.isMainQuest || canClaim) && (
                          <div className={styles.questFooter}>
                            {!quest.isMainQuest && renderRewardRow(quest)}
                            {canClaim && (
                              <button
                                type="button"
                                className="btn"
                                disabled={processing || submittingQuestId !== null}
                                onClick={() => handleClaimReward(quest.id)}
                              >
                                {submittingQuestId === quest.id ? 'Claiming...' : 'Claim Reward'}
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {finishedQuests.length > 0 && (
              <section className={styles.section} aria-label="Completed and Failed Quests">
                <h4 className={styles.sectionTitle}>
                  Completed / Failed ({finishedQuests.length})
                </h4>
                <ul className={styles.questList}>
                  {finishedQuests.map(quest => {
                    const completer = gameState.players.find(p => p.id === quest.completedByPlayerId);
                    return (
                      <li key={quest.id} className={`${styles.questCard} ${styles.questCardCompleted}`}>
                        <div className={styles.questHeader}>
                          <span className={styles.questTitle}>{quest.title}</span>
                          <div className={styles.badges}>
                            {quest.status === 'completed' ? (
                              <span className={styles.statusBadgeCompleted}>
                                Completed{completer ? ` by ${completer.name}` : ''}
                              </span>
                            ) : (
                              <span className={styles.statusBadgeFailed}>Failed</span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>

          <Dialog.Close
            className="DialogClose btn-secondary material-symbols-outlined"
            aria-label="Close"
          >
            close
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
