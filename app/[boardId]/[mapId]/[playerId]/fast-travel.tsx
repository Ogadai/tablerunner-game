'use client';

import { useState } from 'react';
import { Dialog } from 'radix-ui';
import { GameState, PlayerAction, PlayerActionPortal, PlayerActionType, PlayerState } from '@/lib/store/types';
import { games } from '@/lib/games/games';
import styles from './fast-travel.module.css';

interface FastTravelProps {
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

export default function FastTravel({
  player,
  gameState,
  playerCanMove,
  hasLivingEnemies,
  actionPointsLeft,
  moveCost,
  addNewAction,
  endTurnAction,
}: FastTravelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const gameDef = games.find(g => g.id === gameState.gameId);
  const locations = gameDef?.locations || [];

  const visitedPortals = gameState.visitedPortals;

  const availableDestinations = visitedPortals
    .filter(locId => locId !== player.location.id && gameState.portals?.includes(locId));

  const canFastTravel = playerCanMove && !hasLivingEnemies && actionPointsLeft >= moveCost;

  const handleTravel = async (targetLocation: number) => {
    // await addNewAction({
    //   type: PlayerActionType.Portal,
    //   description: `Portal to Location ${targetLocation}`,
    //   targetLocation,
    // } as Omit<PlayerActionPortal, 'id'>);

    // setIsOpen(false);
    // endTurnAction();
  };

  return (
    <div className={styles.fastTravel}>
      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Trigger asChild>
          <button
            type="button"
            className={`${styles.travelIcon} ${canFastTravel ? '' : styles.disabledTravelIcon}`}
            aria-label="Fast Travel"
            title="Fast Travel"
            style={{ backgroundPosition: `-${4 * 40}px -${5 * 40}px` }}
          ></button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="DialogOverlay" />
          <Dialog.Content className={`DialogContent ${styles.fastTravelDialog}`}>
            <Dialog.Title className="DialogTitle">
              Fast Travel
            </Dialog.Title>

            <p>Blurb and map</p>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
