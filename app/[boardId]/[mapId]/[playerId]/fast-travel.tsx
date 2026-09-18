'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { GameState, PlayerAction, PlayerActionFastTravel, PlayerActionPortal, PlayerActionType, PlayerState } from '@/lib/store/types';
import type { Location, LocationMove } from '@/lib/games/types';
import { games } from '@/lib/games/games';
import NumberGrid from '@/app/number-grid/number-grid';
import styles from './fast-travel.module.css';
import { getCellCoordinates } from '@/lib/games/monster-pack';

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
   const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      console.log('scrolling', containerRef.current);
      (containerRef.current as any).scrollTo({ top: 200, left: 0 });
    }
  }, [containerRef.current]); // Empty dependency array ensures this runs once on mount

  const canFastTravel = playerCanMove && !hasLivingEnemies && actionPointsLeft >= moveCost;

  const handleTravel = async (targetLocation: number) => {
    await addNewAction({
      type: PlayerActionType.FastTravel,
      description: `Run to Location ${targetLocation}`,
      targetLocation,
    } as Omit<PlayerActionFastTravel, 'id'>);

    setIsOpen(false);
    endTurnAction();
  };

  return (<div className={styles.fastTravel}>
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
            Run for it
          </Dialog.Title>
          <FastTravelDialogContent
            player={player}
            gameState={gameState}
            onCircleClick={handleTravel}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </div>);
}

function FastTravelDialogContent({
  player,
  gameState,
  onCircleClick,
}: {
  player: PlayerState;
  gameState: GameState;
  onCircleClick: (location: number) => void;
}) {
  const containerRef = useRef(null);
  const currentCoordinates = getCellCoordinates(player.location.id);

  useEffect(() => {
    if (containerRef.current) {
      const divElement = containerRef.current as HTMLElement;
      const locationCell = divElement.querySelector(`#grid-cell-${player.location.id}`);

      if (locationCell) {
        const divRect = divElement.getBoundingClientRect();
        const cellRect = locationCell.getBoundingClientRect();

        divElement.scrollTo({
          top: (13 - currentCoordinates.row) * cellRect.height + cellRect.height / 2 - divRect.height / 2 + 15,
          left: (1 + currentCoordinates.col) * cellRect.width + cellRect.width / 2 - divRect.width / 2 + 15
        });
      }
    }
  }, [containerRef.current]); // Empty dependency array ensures this runs once on mount

  const gameDef = games.find(g => g.id === gameState.gameId);
  const locations = gameDef?.locations || [];
  const visited = gameState.visited;

  const getAvailableLocations = (from: number, steps: number): number[] => {
    const location = locations.find(l => l.id === from)!;
    const available: number[] = [from];
    if (steps > 0) {
      for(const mv of location.move) {
        if (visited.includes(mv.id)) {
          const ledLit = gameState.leds.find(l => l.location === mv.id);
          if (!ledLit || ledLit.owner === 'portal' || ledLit.owner === 'shop') {
            available.push(
              ...getAvailableLocations(mv.id, steps - 1)
            );
          }
        }
      }
    }
    return available;
  }
  const availableLocations = getAvailableLocations(player.location.id, 5);

  const getCircleClass = (location: Location) => {
    if (location.id === player.location.id) {
      return 'playerLocation';
    } else if (!availableLocations.includes(location.id)) {
      return 'noTravel';
    } else {
      const led = gameState.leds.find(l => l.location === location.id);
      if (led) {
        return led.owner;
      }
    }
    return undefined;
  }

  const onCircleClickFn = (location: Location) => {
    if (availableLocations.includes(location.id)) {
      onCircleClick(location.id);
    }
  }

  return (
    <div className={styles.travelMapContainer} ref={containerRef}>
      <div className={styles.travelMap}>
        <NumberGrid
          gameId={gameState.gameId}
          className={styles.gridContainer}
          getCircleClass={getCircleClass}
          onCircleClick={onCircleClickFn}
        />
      </div>
    </div>
  );
}
