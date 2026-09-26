import type { ComponentProps } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import NumberGrid from '@/app/number-grid/number-grid';
import { games } from '@/lib/games/games';
import { PlayerActionType } from '@/lib/store/types';
import FastTravel from './fast-travel';
import { makeGameState, makePlayer } from './test-fixtures';

jest.mock('@/lib/games/games', () => ({ games: [{ id: 'game-1', locations:
  Array.from({ length: 8 }, (_, index) => ({ id: index + 1, description: `Location ${index + 1}`,
    move: index < 7 ? [{ id: index + 2, direction: 'n' }] : [] })),
}] }));
jest.mock('@/app/number-grid/number-grid', () => ({ __esModule: true, default: jest.fn() }));

describe('FastTravel', () => {
  beforeEach(() => {
    jest.mocked(NumberGrid).mockImplementation((props: ComponentProps<typeof NumberGrid>) => <div>
      {games[0].locations.map(location => <button key={location.id}
        className={props.getCircleClass?.(location)} onClick={() => props.onCircleClick?.(location)}>
        Location {location.id}
      </button>)}
    </div>);
  });

  function setup(leds: ReturnType<typeof makeGameState>['leds'] = [], visited = [1, 2, 3, 4, 5, 6, 7, 8]) {
    const addNewAction = jest.fn().mockResolvedValue(undefined);
    const endTurnAction = jest.fn();
    render(<FastTravel boardId="board" mapId="map" player={makePlayer()}
      gameState={makeGameState({ visited, leds })} playerCanMove hasLivingEnemies={false}
      actionPointsLeft={2} moveCost={2} addNewAction={addNewAction} endTurnAction={endTurnAction} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fast Travel' }));
    return { addNewAction, endTurnAction };
  }

  it('allows visited destinations up to five steps away and submits travel before ending the turn', async () => {
    const { addNewAction, endTurnAction } = setup();
    expect(screen.getByRole('button', { name: 'Location 1' })).toHaveClass('playerLocation');
    fireEvent.click(screen.getByRole('button', { name: 'Location 7' }));
    expect(addNewAction).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Location 6' })));
    expect(addNewAction).toHaveBeenCalledWith({ type: PlayerActionType.FastTravel,
      description: 'Run to Location 6', targetLocation: 6 });
    expect(endTurnAction).toHaveBeenCalledTimes(1);
    expect(addNewAction.mock.invocationCallOrder[0]).toBeLessThan(endTurnAction.mock.invocationCallOrder[0]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each(['monster', 'portal', 'shop'])('handles a route through a %s marker', owner => {
    const { addNewAction } = setup([{ location: 2, owner, rgb: 'ffffff' }]);
    const destination = screen.getByRole('button', { name: 'Location 3' });
    if (owner === 'monster') {
      expect(destination).toHaveClass('noTravel');
      fireEvent.click(destination);
      expect(addNewAction).not.toHaveBeenCalled();
    } else {
      expect(destination).not.toHaveClass('noTravel');
      expect(screen.getByRole('button', { name: 'Location 2' })).toHaveClass(owner);
    }
  });

  it('does not traverse unvisited locations to reach visited destinations', () => {
    const { addNewAction } = setup([], [1, 3]);
    fireEvent.click(screen.getByRole('button', { name: 'Location 3' }));
    expect(addNewAction).not.toHaveBeenCalled();
  });
});
