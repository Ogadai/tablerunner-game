'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { cauldronOfFire } from '@/lib/games/maps/cauldron-of-fire/index';
import { GRID_CELLS, MAP_COLUMNS } from '@/lib/games/gridCells';
import type { Location, LocationMove } from '@/lib/games/types';
import styles from './number-grid.module.css';

const DIAGONAL_MOVES = ['nw', 'ne', 'se', 'sw'];

const locationsForGames: Record<string, Location[]> = {
  cauldronfire: cauldronOfFire.locations,
};

const directionAngles: Record<LocationMove['direction'], number> = {
  n: -90,
  ne: -45,
  e: 0,
  se: 45,
  s: 90,
  sw: 135,
  w: 180,
  nw: -135,
};

export interface NumberGridProps {
  gameId: string;
  locations?: Location[];
  showNumberLabel?: boolean;
  getCircleClass?: (location: Location) => string | undefined
  showLineStatus?: boolean;
  renderCircleStatus?: (location: Location) => ReactNode;
  renderLineStatus?: (location: Location, move: LocationMove) => ReactNode;
  onCircleClick?: (location: Location) => void;
  onLineClick?: (location: Location, move: LocationMove) => void;
  onCellMouseDown?: (cell: number) => void;
  onCellMouseUp?: (cell: number) => void;
  page?: 1 | 2;
  className?: string;
}

export const getLocationsForGame = (gameId: string): Location[] =>
  locationsForGames[gameId] || locationsForGames.cauldronfire;

export default function NumberGrid({
  gameId,
  locations = getLocationsForGame(gameId),
  showNumberLabel = true,
  getCircleClass = () => '',
  showLineStatus = false,
  renderCircleStatus,
  renderLineStatus,
  onCircleClick,
  onLineClick,
  onCellMouseDown,
  onCellMouseUp,
  page,
  className,
}: NumberGridProps) {
  const renderCell = (cell: number) => {
    const location = locations.find(candidate => candidate.id === cell);
    const cellIndex = GRID_CELLS.indexOf(cell);
    const thisPage = Math.floor(cellIndex / (MAP_COLUMNS / 2)) % 2;

    if (page && thisPage !== page - 1) {
      return null;
    }

    const moves = location?.move ?? [];

    const getLocationClass = (location: Location | undefined): string => {
      if (location) {
        const className = getCircleClass(location);
        return className ? styles[className] : '';
      }
      return '';
    }

    return (
      <div
        id={`grid-cell-${cell}`}
        key={cell}
        className={`${styles.cell} ${location?.underground ? styles.cellUnderground : ''}`}
        onMouseDown={() => onCellMouseDown?.(cell)}
        onMouseUp={() => onCellMouseUp?.(cell)}
        title={location?.description}
      >
        {moves.map(move => (
          (() => {
            const lineStatus = showLineStatus && location ? renderLineStatus?.(location, move) : null;

            return (
              <div
                key={`${cell}-${move.direction}-${move.id}`}
                className={`${styles.moveLine} ${DIAGONAL_MOVES.includes(move.direction) ? styles.moveLineDiagonal : ''} ${onLineClick ? styles.moveLineClickable : ''}`}
                style={{ transform: `translateY(-50%) rotate(${directionAngles[move.direction]}deg)` }}
                aria-hidden="true"
                onMouseDown={event => event.stopPropagation()}
                onClick={event => {
                  event.stopPropagation();
                  if (location) onLineClick?.(location, move);
                }}
              >
                {lineStatus && <span className={styles.lineStatus}>{lineStatus}</span>}
              </div>
            );
          })()
        ))}
        <div
          className={`${styles.circle} ${getLocationClass(location)}`}
          onClick={event => {
            event.stopPropagation();
            if (location) onCircleClick?.(location);
          }}
        >
          {showNumberLabel && <span className={styles.number}>{cell}</span>}
          {renderCircleStatus && location && renderCircleStatus?.(location) && (
            <span className={styles.circleStatus}>{renderCircleStatus(location)}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.runberGrid}>
      <Image
        src="/map.png"
        width={1536}
        height={1024}
        className={`${styles.mapImage} ${page === 1 ? styles.pageOne : ''} ${page === 2 ? styles.pageTwo : ''}`}
        loading="eager"
        alt="The map of Cauldron of Fire"
      />
      <div className={`${styles.gridContainer} ${className || ''}`}>{GRID_CELLS.map(renderCell)}</div>
    </div>
  );
}