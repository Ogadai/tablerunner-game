import type { ComponentProps } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PlayerActionType } from '@/lib/store/types';
import PlayerPortal from './player-portal';
import { makeGameState, makePlayer } from './test-fixtures';

jest.mock('@/lib/games/games', () => ({ games: [{ id: 'game-1', locations: [
  { id: 2, description: 'A peaceful clearing. More description.' },
] }] }));

function setup(overrides: Partial<ComponentProps<typeof PlayerPortal>> = {}) {
  const props = {
    boardId: 'board', mapId: 'map', player: makePlayer(),
    gameState: makeGameState({ portals: [1, 2, 3], visitedPortals: [1, 2, 4] }),
    playerCanMove: true, hasLivingEnemies: false, actionPointsLeft: 2, moveCost: 2,
    addNewAction: jest.fn().mockResolvedValue(undefined), endTurnAction: jest.fn(), ...overrides,
  };
  render(<PlayerPortal {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Portal' }));
  return props;
}

describe('PlayerPortal', () => {
  it('offers only other visited, active portals', () => {
    setup();
    expect(screen.getByText('Location 2')).toBeInTheDocument();
    expect(screen.getByText('A peaceful clearing')).toBeInTheDocument();
    for (const id of [1, 3, 4]) expect(screen.queryByText(`Location ${id}`)).not.toBeInTheDocument();
  });

  it.each([{ hasLivingEnemies: true }, { playerCanMove: false }, { actionPointsLeft: 1 }])(
    'prevents travel with %o', overrides => {
      const props = setup(overrides);
      fireEvent.click(screen.getByRole('button', { name: 'Travel' }));
      expect(screen.getByRole('button', { name: 'Travel' })).toBeDisabled();
      expect(props.addNewAction).not.toHaveBeenCalled();
    },
  );

  it('waits for the travel action to save before closing and ending the turn', async () => {
    let finish!: () => void;
    const addNewAction = jest.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const props = setup({ addNewAction });
    fireEvent.click(screen.getByRole('button', { name: 'Travel' }));
    expect(addNewAction).toHaveBeenCalledWith({ type: PlayerActionType.Portal,
      description: 'Portal to Location 2', targetLocation: 2 });
    expect(props.endTurnAction).not.toHaveBeenCalled();
    await act(async () => finish());
    await waitFor(() => expect(props.endTurnAction).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('explains when no other portals have been discovered', () => {
    setup({ gameState: makeGameState({ portals: [1], visitedPortals: [1] }) });
    expect(screen.getByText('You have not discovered any other Portal Stones yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Travel' })).not.toBeInTheDocument();
  });
});
