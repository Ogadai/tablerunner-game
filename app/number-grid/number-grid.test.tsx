import { fireEvent, render } from '@testing-library/react';
import NumberGrid, { getLocationsForGame } from './number-grid';
import type { Location } from '@/lib/games/types';

describe('NumberGrid', () => {
  it('uses game locations and exposes labels, statuses, and click callbacks', () => {
    const locations: Location[] = [
      { id: 1, description: 'Start', move: [{ direction: 'e', id: 2 }] },
      { id: 2, description: 'Next', move: [] },
    ];
    const onCircleClick = jest.fn();
    const onLineClick = jest.fn();

    const { container, getByText, getAllByText } = render(
      <NumberGrid
        gameId="cauldronfire"
        locations={locations}
        showCircleStatus
        showLineStatus
        renderCircleStatus={() => 'circle-status'}
        renderLineStatus={() => 'line-status'}
        onCircleClick={onCircleClick}
        onLineClick={onLineClick}
      />
    );

    expect(getLocationsForGame('cauldronfire')).not.toHaveLength(0);
    expect(getByText('1')).toBeInTheDocument();
    expect(getAllByText('circle-status')).toHaveLength(2);
    expect(getByText('line-status')).toBeInTheDocument();

    fireEvent.click(getByText('1'));
    fireEvent.click(container.querySelector('[aria-hidden="true"]')!);

    expect(onCircleClick).toHaveBeenCalledWith(locations[0]);
    expect(onLineClick).toHaveBeenCalledWith(locations[0], locations[0].move[0]);
  });

  it('can hide attached number labels', () => {
    const { queryByText } = render(
      <NumberGrid gameId="cauldronfire" locations={[{ id: 1, description: '', move: [] }]} showNumberLabel={false} />
    );

    expect(queryByText('1')).not.toBeInTheDocument();
  });
});