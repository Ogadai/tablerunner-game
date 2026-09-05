import { ensureBidirectionalMove, getDirectionBetweenCells, removeBidirectionalMove } from './mapedit';
import { Location } from '@/lib/games/types';

describe('MapEdit movement helpers', () => {
  it('calculates the correct direction between adjacent cells on the map grid', () => {
    expect(getDirectionBetweenCells(10, 31)).toBe('n');
    expect(getDirectionBetweenCells(31, 10)).toBe('s');
    expect(getDirectionBetweenCells(10, 11)).toBe('e');
    expect(getDirectionBetweenCells(11, 10)).toBe('w');
    expect(getDirectionBetweenCells(30, 10)).toBe('sw');
    expect(getDirectionBetweenCells(31, 30)).toBe('e');
  });

  it('adds symmetric moves between adjacent locations without duplicating entries', () => {
    const mapState: Location[] = [
      { id: 10, description: '', move: [] },
      { id: 31, description: '', move: [{ direction: 's', id: 10 }] },
    ];

    const updated = ensureBidirectionalMove(mapState, 10, 31);

    expect(updated[0].move).toEqual(expect.arrayContaining([{ direction: 'n', id: 31 }]));
    expect(updated[1].move).toEqual(expect.arrayContaining([{ direction: 's', id: 10 }]));
    expect(updated[0].move).toHaveLength(1);
    expect(updated[1].move).toHaveLength(1);
  });

  it('removes the matching link from both ends of an adjacent connection', () => {
    const mapState: Location[] = [
      { id: 10, description: '', move: [{ direction: 'n', id: 31 }] },
      { id: 31, description: '', move: [{ direction: 's', id: 10 }] },
    ];

    const updated = removeBidirectionalMove(mapState, 10, 31);

    expect(updated[0].move).toEqual([]);
    expect(updated[1].move).toEqual([]);
  });
});
