'use client';

import { useState } from 'react';
import { Dialog } from 'radix-ui';
import styles from './player-portal.module.css';
import { GameState, PlayerAction, PlayerActionPortal, PlayerActionType, PlayerState } from '@/lib/store/types';
import { games } from '@/lib/games/games';

interface PlayerPortalProps {
  boardId: string;
  mapId: string;
  player: PlayerState;
  gameState: GameState;
  playerCanMove: boolean;
  hasLivingEnemies: boolean;
  actionPointsLeft: number;
  moveCost: number;
  addNewAction: (opts: Omit<PlayerAction, 'id'>) => Promise<void>;
  endTurnAction: () => void;
}

export default function PlayerPortal({
  player,
  gameState,
  playerCanMove,
  hasLivingEnemies,
  actionPointsLeft,
  moveCost,
  addNewAction,
  endTurnAction,
}: PlayerPortalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const gameDef = games.find(g => g.id === gameState.gameId);
  const locations = gameDef?.locations || [];

  const visitedPortals = gameState.visitedPortals;

  const availableDestinations = visitedPortals
    .filter(locId => locId !== player.location.id && gameState.portals?.includes(locId));

  const canPortal = playerCanMove && !hasLivingEnemies && actionPointsLeft >= moveCost;

  const handleTravel = async (targetLocation: number) => {
    await addNewAction({
      type: PlayerActionType.Portal,
      description: `Portal to Location ${targetLocation}`,
      targetLocation,
    } as Omit<PlayerActionPortal, 'id'>);

    setIsOpen(false);
    endTurnAction();
  };

  const getLocationSnippet = (locId: number): { title: string; desc: string } => {
    const loc = locations.find(l => l.id === locId);
    if (!loc) {
      return { title: `Location ${locId}`, desc: 'Portal Stone' };
    }

    const firstSentence = loc.description.split('.')[0] || loc.description;
    return {
      title: `Location ${locId}`,
      desc: firstSentence.length > 50 ? `${firstSentence.substring(0, 50)}...` : firstSentence,
    };
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={styles.portalTrigger}
          title="Use the Portal Stone to quick-travel"
        >
          <span>Portal</span>
          <span className={`${styles.portalTriggerIcon} material-symbols-outlined`}>auto_awesome</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className={`DialogContent ${styles.portalDialog}`}>
          <Dialog.Title className="DialogTitle">
            Portal Stone
          </Dialog.Title>

          <p className={styles.portalIntro}>
            An ancient monolith humming with teleportation magic. You may channel its energy to travel to any previously visited Portal Stone. Using the portal takes your full turn.
          </p>

          {hasLivingEnemies && (
            <div className={styles.warningBanner}>
              <span className="material-symbols-outlined">warning</span>
              <span>Cannot activate the portal while enemies are present!</span>
            </div>
          )}

          {!hasLivingEnemies && actionPointsLeft < moveCost && (
            <div className={styles.warningBanner}>
              <span className="material-symbols-outlined">warning</span>
              <span>Not enough Action Points left this turn ({actionPointsLeft}/{moveCost} required).</span>
            </div>
          )}

          {availableDestinations.length === 0 ? (
            <div className={styles.emptyNotice}>
              <span className={`${styles.emptyIcon} material-symbols-outlined`}>travel_explore</span>
              <p>You have not discovered any other Portal Stones yet.</p>
              <p>Explore the realm to find and activate other portal locations!</p>
            </div>
          ) : (
            <ul className={styles.destinationsList}>
              {availableDestinations.map(destId => {
                const info = getLocationSnippet(destId);
                return (
                  <li key={destId} className={styles.destinationItem}>
                    <div className={styles.destinationInfo}>
                      <div className={styles.destinationTitle}>
                        <span className="material-symbols-outlined">auto_awesome</span>
                        <span>{info.title}</span>
                      </div>
                      <div className={styles.destinationDesc} title={info.desc}>
                        {info.desc}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`btn ${styles.travelButton}`}
                      disabled={!canPortal}
                      onClick={() => handleTravel(destId)}
                    >
                      Travel
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
