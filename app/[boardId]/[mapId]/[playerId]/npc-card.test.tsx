import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { hireNpc } from '@/lib/store/playerInventory';
import NpcCard from './npc-card';
import sync from './player-stats-sync.service';
import { makeNpc, makePlayer } from './test-fixtures';

jest.mock('@/lib/store/playerInventory', () => ({ hireNpc: jest.fn() }));
jest.mock('./player-stats-sync.service', () => ({ __esModule: true, default: { updateInventory: jest.fn() } }));

describe('NpcCard', () => {
  it.each([true, false])('updates inventory and closes only for a successful hire (%s)', async success => {
    const data = { equipment: [], equipped: {}, coins: 0 };
    jest.mocked(hireNpc).mockResolvedValue({ success, data });
    const onHired = jest.fn();
    render(<NpcCard boardId="board" mapId="map" npc={makeNpc()} player={makePlayer({ coins: 10 })} onHired={onHired} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hire' }));
    await waitFor(() => expect(hireNpc).toHaveBeenCalledWith('board', 'map', 'warrior', 'npc-1'));
    if (success) {
      await waitFor(() => expect(onHired).toHaveBeenCalledTimes(1));
      expect(sync.updateInventory).toHaveBeenCalledWith(data);
    } else {
      expect(onHired).not.toHaveBeenCalled();
      expect(sync.updateInventory).not.toHaveBeenCalled();
    }
  });

  it.each([{ coins: 9, health: 10, npcHealth: 10 }, { coins: 10, health: 0, npcHealth: 10 },
    { coins: 10, health: 10, npcHealth: 0 }])('blocks hiring with %o', ({ coins, health, npcHealth }) => {
    render(<NpcCard boardId="board" mapId="map" npc={makeNpc({ health: npcHealth })}
      player={makePlayer({ coins, health })} onHired={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Hire' })).toBeDisabled();
  });

  it('does not offer already hired NPCs', () => {
    render(<NpcCard boardId="board" mapId="map" npc={makeNpc({ masterId: 'warrior' })}
      player={makePlayer({ coins: 100 })} onHired={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Hire' })).not.toBeInTheDocument();
  });
});
