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
    const { container } = render(<NpcCard boardId="board" mapId="map" npc={makeNpc({ team: null })}
      player={makePlayer({ coins: 10 })} onHired={onHired} />);
    const hireButton = screen.getByRole('button', { name: /Hire for 10/ });
    expect(hireButton).toHaveTextContent('Hire for10');
    expect(hireButton.querySelector('img[alt="Coins"]')).toBeInTheDocument();
    expect(container.firstElementChild).toContainElement(hireButton);
    fireEvent.click(hireButton);
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
    render(<NpcCard boardId="board" mapId="map" npc={makeNpc({ health: npcHealth, team: null })}
      player={makePlayer({ coins, health })} onHired={jest.fn()} />);
    expect(screen.getByRole('button', { name: /Hire for 10/ })).toBeDisabled();
  });

  it('shows plain Hire button when a hireable NPC has no coin cost', () => {
    render(<NpcCard boardId="board" mapId="map" npc={makeNpc({ hireCost: 0, team: null })}
      player={makePlayer({ coins: 0 })} onHired={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Hire' })).toBeEnabled();
    expect(screen.queryByAltText('Coins')).not.toBeInTheDocument();
  });

  it('displays read-only characterStats and derives combat stats from characterStats for leveled NPCs', () => {
    const npc = makeNpc({
      characterType: 'barbarian',
      level: 2,
      health: 9,
      availableStats: 2,
      equipment: [],
      equipped: {},
      characterStats: { strength: 12, skill: 5, intelligence: 3, reactions: 6, resiliance: 9 },
      baseStats: {
        attack: 1, damage: 1, defence: 1, health: 1, magic: 1, speed: 1,
      },
    });
    render(<NpcCard boardId="board" mapId="map" npc={npc} player={makePlayer()} onHired={jest.fn()} />);
    expect(screen.getByText('Strength').closest('tr')).toHaveTextContent('Strength12');
    expect(screen.getByText('Resilience').closest('tr')).toHaveTextContent('Resilience9');
    expect(screen.queryByRole('button', { name: /Increase/ })).not.toBeInTheDocument();
    expect(screen.getByText('Attack').nextElementSibling?.textContent).toBe('12');
    expect(screen.getByText('Health').nextElementSibling?.textContent).toBe('9');
  });

  it.each([{ masterId: 'warrior', team: null }, { masterId: null, team: 'good' }])('does not offer unavailable NPCs (%o)', overrides => {
    render(<NpcCard boardId="board" mapId="map" npc={makeNpc(overrides)}
      player={makePlayer({ coins: 100 })} onHired={jest.fn()} />);
    expect(screen.queryByRole('button', { name: /Hire/ })).not.toBeInTheDocument();
    expect(screen.queryByAltText('Coins')).not.toBeInTheDocument();
  });
});
