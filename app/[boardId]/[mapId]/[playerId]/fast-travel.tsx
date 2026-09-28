'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { GameState, PlayerAction, PlayerActionFastTravel, PlayerActionType, PlayerState } from '@/lib/store/types';
import type { Location } from '@/lib/games/types';
import NumberGrid from '@/app/number-grid/number-grid';
import styles from './fast-travel.module.css';
import { getCellCoordinates } from '@/lib/games/monster-pack';
import { getAvailableFastTravelLocations } from '@/lib/store/locationState';

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
  boardId,
  mapId,
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
  const [availableLocations, setAvailableLocations] = useState<number[] | null>(null);
   const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      console.log('scrolling', containerRef.current);
      (containerRef.current as any).scrollTo({ top: 200, left: 0 });
    }
  }, [containerRef.current]); // Empty dependency array ensures this runs once on mount

  const canFastTravel = playerCanMove && !hasLivingEnemies && actionPointsLeft >= moveCost;

  useEffect(() => {
    if (!isOpen || !canFastTravel) return;
    let active = true;
    setAvailableLocations(null);
    async function loadDestinations() {
      try {
        const result = await getAvailableFastTravelLocations(boardId, mapId, player.id);
        if (active) setAvailableLocations(result.data ?? []);
      } catch {
        if (active) setAvailableLocations([]);
      }
    }
    void loadDestinations();
    return () => { active = false; };
  }, [isOpen, canFastTravel, boardId, mapId, player.id, gameState]);

  const handleTravel = async (targetLocation: number) => {
    if (!canFastTravel || !availableLocations?.includes(targetLocation)) return;
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
          disabled={!canFastTravel}
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
          {availableLocations === null ? <p>Loading destinations...</p> : <FastTravelDialogContent
            player={player}
            gameState={gameState}
            availableLocations={availableLocations}
            onCircleClick={handleTravel}
          />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </div>);
}

function FastTravelDialogContent({
  player,
  gameState,
  availableLocations,
  onCircleClick,
}: {
  player: PlayerState;
  gameState: GameState;
  availableLocations: number[];
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
