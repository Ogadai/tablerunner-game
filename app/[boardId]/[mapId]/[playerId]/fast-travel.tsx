'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { GameState, PlayerAction, PlayerActionFastTravel, PlayerActionType, PlayerState } from '@/lib/store/types';
import type { Location } from '@/lib/games/types';
import NumberGrid from '@/app/number-grid/number-grid';
import styles from './fast-travel.module.css';
import { getCellCoordinates, MAP_ROWS } from '@/lib/games/gridCells';
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
  const canFastTravel = playerCanMove && !hasLivingEnemies && actionPointsLeft >= moveCost;
  const request = useMemo(() => ({ boardId, mapId, playerId: player.id, isOpen, canFastTravel, gameState }),
    [boardId, mapId, player.id, isOpen, canFastTravel, gameState]);
  const [destinations, setDestinations] = useState<{ request: typeof request; locations: number[] } | null>(null);
  const availableLocations = destinations?.request === request ? destinations.locations : null;

  useEffect(() => {
    if (!request.isOpen || !request.canFastTravel) return;
    let active = true;
    async function loadDestinations() {
      try {
        const result = await getAvailableFastTravelLocations(request.boardId, request.mapId, request.playerId);
        if (active) setDestinations({ request, locations: result.data ?? [] });
      } catch {
        if (active) setDestinations({ request, locations: [] });
      }
    }
    void loadDestinations();
    return () => { active = false; };
  }, [request]);

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
  const containerRef = useRef<HTMLDivElement>(null);
  const currentCoordinates = getCellCoordinates(player.location.id);

  useEffect(() => {
    if (containerRef.current) {
      const divElement = containerRef.current;
      const locationCell = divElement.querySelector(`#grid-cell-${player.location.id}`);

      if (locationCell) {
        const divRect = divElement.getBoundingClientRect();
        const cellRect = locationCell.getBoundingClientRect();

        divElement.scrollTo({
          top: (MAP_ROWS - currentCoordinates.row) * cellRect.height + cellRect.height / 2 - divRect.height / 2 + 15,
          left: (1 + currentCoordinates.col) * cellRect.width + cellRect.width / 2 - divRect.width / 2 + 15
        });
      }
    }
  }, [player.location.id, currentCoordinates.row, currentCoordinates.col]);

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
