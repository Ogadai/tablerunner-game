import type { ComponentProps } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import NumberGrid from '@/app/number-grid/number-grid';
import { games } from '@/lib/games/games';
import { PlayerActionType } from '@/lib/store/types';
import FastTravel from './fast-travel';
import { makeGameState, makePlayer } from './test-fixtures';
import { getAvailableFastTravelLocations } from '@/lib/store/locationState';
import { getFastTravelLocations } from '@/lib/runner/fast-travel-locations';
import { createMonster } from '@/lib/runner/test-support/fixtures';

jest.mock('@/lib/store/locationState', () => ({ getAvailableFastTravelLocations: jest.fn() }));

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

  async function setup(leds: ReturnType<typeof makeGameState>['leds'] = [], visited = [1, 2, 3, 4, 5, 6, 7, 8], hasLivingEnemies = false) {
    const addNewAction = jest.fn().mockResolvedValue(undefined);
    const endTurnAction = jest.fn();
    const player = makePlayer({ location: games[0].locations[0] });
    const gameState = makeGameState({ visited, leds });
    jest.mocked(getAvailableFastTravelLocations).mockResolvedValue({ success: true,
      data: getFastTravelLocations({ gameState, monsters: leds.some(l => l.owner === 'monster')
        ? [createMonster({ location: 2 })] : [] }, games[0].locations, player) });
    render(<FastTravel boardId="board" mapId="map" player={player}
      gameState={gameState} playerCanMove hasLivingEnemies={hasLivingEnemies}
      actionPointsLeft={2} moveCost={2} addNewAction={addNewAction} endTurnAction={endTurnAction} />);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Fast Travel' })));
    return { addNewAction, endTurnAction };
  }

  it('allows visited destinations up to five steps away and submits travel before ending the turn', async () => {
    const { addNewAction, endTurnAction } = await setup();
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

  it.each(['monster', 'portal', 'shop'])('handles a route through a %s marker', async owner => {
    const { addNewAction } = await setup([{ location: 2, owner, rgb: 'ffffff' }]);
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

  it('does not traverse unvisited locations to reach visited destinations', async () => {
    const { addNewAction } = await setup([], [1, 3]);
    fireEvent.click(screen.getByRole('button', { name: 'Location 3' }));
    expect(addNewAction).not.toHaveBeenCalled();
  });

  it('disables travel when enemies are present', async () => {
    const { addNewAction } = await setup([], [1, 2], true);
    expect(screen.getByRole('button', { name: 'Fast Travel' })).toBeDisabled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(addNewAction).not.toHaveBeenCalled();
  });
});
