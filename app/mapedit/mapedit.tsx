'use client'

import Swal from 'sweetalert2'
import { getSwalDefaultOptions } from '@/app/swal';
import { useRef, useState } from 'react';
import styles from './mapedit.module.css';
import { useSearchParams } from 'next/navigation';
import { cinzel } from '@/app/fonts';
import Image from 'next/image';

import { cauldronOfFire as mapData } from '@/lib/games/maps';
import { Location, LocationMoveDirection } from '@/lib/games/types';
import { GRID_CELLS, MAP_COLUMNS, MAP_ROWS } from '@/lib/games/gridCells';

const DIAGONAL_MOVES = ['nw', 'ne', 'se', 'sw'];

export const getCellCoordinates = (cell: number) => {
  const index = GRID_CELLS.indexOf(cell);

  if (index === -1) {
    return { row: -1, col: -1 };
  }

  return {
    row: Math.floor(index / MAP_COLUMNS),
    col: index % MAP_COLUMNS,
  };
};

export const getDirectionBetweenCells = (fromCell: number, toCell: number): LocationMoveDirection | undefined => {
  const from = getCellCoordinates(fromCell);
  const to = getCellCoordinates(toCell);

  if (from.row === -1 || to.row === -1) {
    return undefined;
  }

  const rowDelta = to.row - from.row;
  const colDelta = to.col - from.col;

  if (Math.abs(rowDelta) > 1 || Math.abs(colDelta) > 1 || (rowDelta === 0 && colDelta === 0)) {
    return undefined;
  }

  const directionMap: Record<string, LocationMoveDirection> = {
    '-1,0': 'n',
    '-1,1': 'ne',
    '0,1': 'e',
    '1,1': 'se',
    '1,0': 's',
    '1,-1': 'sw',
    '0,-1': 'w',
    '-1,-1': 'nw',
  };

  return directionMap[`${rowDelta},${colDelta}`];
};

const getOppositeDirection = (direction: LocationMoveDirection): LocationMoveDirection => {
  const oppositeDirections: Record<LocationMoveDirection, LocationMoveDirection> = {
    n: 's',
    ne: 'sw',
    e: 'w',
    se: 'nw',
    s: 'n',
    sw: 'ne',
    w: 'e',
    nw: 'se',
  };

  return oppositeDirections[direction];
};

export const ensureBidirectionalMove = (mapState: Location[], startCell: number, endCell: number): Location[] => {
  const directionFromStartToEnd = getDirectionBetweenCells(startCell, endCell);

  if (!directionFromStartToEnd) {
    return mapState;
  }

  const directionFromEndToStart = getOppositeDirection(directionFromStartToEnd);

  const addMoveIfMissing = (location: Location, direction: LocationMoveDirection, targetCell: number) => {
    const alreadyExists = location.move.some(move => move.id === targetCell && move.direction === direction);

    if (alreadyExists) {
      return location;
    }

    return {
      ...location,
      move: [...location.move, { direction, id: targetCell }],
    };
  };

  return mapState.map(location => {
    if (location.id === startCell) {
      return addMoveIfMissing(location, directionFromStartToEnd, endCell);
    }

    if (location.id === endCell) {
      return addMoveIfMissing(location, directionFromEndToStart, startCell);
    }

    return location;
  });
};

export const removeBidirectionalMove = (mapState: Location[], startCell: number, endCell: number): Location[] => {
  const directionFromStartToEnd = getDirectionBetweenCells(startCell, endCell);

  if (!directionFromStartToEnd) {
    return mapState;
  }

  const directionFromEndToStart = getOppositeDirection(directionFromStartToEnd);

  return mapState.map(location => {
    if (location.id === startCell) {
      return {
        ...location,
        move: location.move.filter(move => !(move.id === endCell && move.direction === directionFromStartToEnd)),
      };
    }

    if (location.id === endCell) {
      return {
        ...location,
        move: location.move.filter(move => !(move.id === startCell && move.direction === directionFromEndToStart)),
      };
    }

    return location;
  });
};

export default function MapEdit() {
  const searchParams = useSearchParams();
  const [mapState, setMapState] = useState(mapData);
  const dragStartCell = useRef<number | null>(null);
  const dragActionTaken = useRef(false);
  
  const page = searchParams.get('page');
  const singlePage = !!page;
 
  const one = (!page || page === '1');
  const two = (!page || page === '2');

  const bindClickLocation = (cell: number) =>
    async () => {
      const location = mapState.find(l => l.id === cell);
      const description = location?.description || '';

      const { value: newDescription, isConfirmed } = await Swal.fire({
        heightAuto: false,
        theme: 'auto',
        title: "Description",
        input: "textarea",
        inputLabel: "Enter the location description",
        inputValue: description,
        showCancelButton: true
      });

      if (location && isConfirmed) {
        const newMapState = mapState.map(l => {
          if (l.id === cell) {
            return {
              ...l,
              description: newDescription
            };
          } else {
            return l;
          }
        });
        setMapState(newMapState);
      }
    }

  const handleCellMouseDown = (cell: number) => {
    dragStartCell.current = cell;
    dragActionTaken.current = false;
  };

  const handleCellMouseUp = (cell: number) => {
    const startCell = dragStartCell.current;
    dragStartCell.current = null;

    if (startCell === null || startCell === cell) {
      dragActionTaken.current = false;
      return;
    }

    const direction = getDirectionBetweenCells(startCell, cell);
    if (!direction) {
      dragActionTaken.current = false;
      return;
    }

    setMapState(current => ensureBidirectionalMove(current, startCell, cell));
    dragActionTaken.current = true;
  };

  const handleCellClick = (cell: number) => {
    if (dragActionTaken.current) {
      dragActionTaken.current = false;
      return;
    }

    void bindClickLocation(cell)();
  };

  const handleMoveLineClick = async (cell: number, move: { id: number; direction: LocationMoveDirection }) => {
    const result = await Swal.fire({
      ...getSwalDefaultOptions(),
      title: 'Delete link?',
      text: `Remove the connection from ${cell} to ${move.id}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete link',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) {
      return;
    }

    setMapState(current => removeBidirectionalMove(current, cell, move.id));
  };

  const renderCell = (cell: number) => {
    const location = mapState.find(l => l.id === cell);
    const description = location?.description || '';
    const moves = location?.move ?? [];

    const directionAngles: Record<string, number> = {
      n: -90,
      ne: -45,
      e: 0,
      se: 45,
      s: 90,
      sw: 135,
      w: 180,
      nw: -135,
    };

    const page = Math.floor((cell + MAP_ROWS - 1) / MAP_COLUMNS) %2;
    return (
      ((one && (page === 0)) || (two && (page === 1))) &&
      <div key={cell}
        onMouseDown={() => handleCellMouseDown(cell)}
        onMouseUp={() => handleCellMouseUp(cell)}
        className={styles.cell} title={description}
      >
        {moves.map(move => (
          <div
            key={`${cell}-${move.direction}-${move.id}`}
            className={`${styles.moveLine} ${DIAGONAL_MOVES.includes(move.direction) ? styles.moveLineDiagonal : ''}`}
            style={{
              transform: `translateY(-50%) rotate(${directionAngles[move.direction]}deg)`
            }}
            aria-hidden="true"
            onMouseDown={event => event.stopPropagation()}
            onClick={event => {
              event.stopPropagation();
              handleMoveLineClick(cell, move);
            }}
          />
        ))}
        <div
          onClick={event => {
            event.stopPropagation();
            handleCellClick(cell);
          }}
          className={`${styles.circle} ${ (!singlePage && description.length > 0) ? styles.namedCircle : ''}`}
        >
          <span className={styles.number}>{ cell }</span>
        </div>
      </div>
    );
  };

  const copyToClipboard = async () => {
    const mapJson = JSON.stringify(mapState, null, 2);
    await navigator.clipboard.writeText(mapJson);
  }

  return (
    <main className={`${styles.host} ${singlePage ? styles.singlePage : styles.doublePage} ${(page === '1') ? styles.pageOne : ''} ${(page === '2') ? styles.pageTwo : ''}`}>
      <Image
        src="/map.png"
        width={1536}
        height={1024}
        className={styles.mapImage}
        loading="eager"
        alt="The map of Couldron of Fire"
      />

      <h3 className={`${cinzel.className} antialiased ${styles.title}`} >Cauldron of Fire</h3>

      <div className={`${styles.gridContainer}`}>
        { GRID_CELLS.map(renderCell) }
      </div>

      { !singlePage && <button
          className={styles.copyButton}
          onClick={copyToClipboard}
        >Copy to clipboard</button> }
    </main>
  );
}
