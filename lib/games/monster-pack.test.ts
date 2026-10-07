import { getCellAtCoordinates, getCellCoordinates, GRID_CELLS, MAP_COLUMNS, MAP_ROWS } from './gridCells';

it.each([
  { cell: 1, row: 0, col: 0 },
  { cell: 20, row: 0, col: 19 },
  { cell: 40, row: 1, col: 0 },
  { cell: 21, row: 1, col: 19 },
  { cell: 240, row: 11, col: 0 },
  { cell: 221, row: 11, col: 19 },
])('maps cell $cell to 0-based coordinates ($row, $col)', ({ cell, row, col }) => {
  expect(getCellCoordinates(cell)).toEqual({ row, col });
  expect(getCellAtCoordinates({ row, col })).toBe(cell);
});

it('round-trips every grid cell', () => {
  for (const cell of GRID_CELLS) {
    expect(getCellAtCoordinates(getCellCoordinates(cell))).toBe(cell);
  }
});

it.each([
  { row: -1, col: 0 },
  { row: MAP_ROWS, col: 0 },
  { row: 1, col: -1 },
  { row: 1, col: MAP_COLUMNS },
  { row: 0.5, col: 0 },
  { row: 0, col: 0.5 },
])('rejects invalid coordinates ($row, $col)', coords => {
  expect(getCellAtCoordinates(coords)).toBe(0);
});

it('returns sentinel coordinates for an unknown cell', () => {
  expect(getCellCoordinates(0)).toEqual({ row: -1, col: -1 });
});
