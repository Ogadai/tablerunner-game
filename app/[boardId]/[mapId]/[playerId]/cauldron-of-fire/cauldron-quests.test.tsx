import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EquipableIds, SpecialIds } from '@/lib/games/items';
import { saveQuestsState } from '@/lib/runner/cauldron-of-fire/quests';
import { acceptCauldronQuest, claimCauldronQuestReward } from '@/lib/runner/cauldron-of-fire/server-actions';
import { createGame, createPlayer } from '@/lib/store/test-support/fixtures';
import playerStatsSyncService from '../player-stats-sync.service';
import gameStateLightingService from '@/app/[boardId]/[mapId]/game/game-state-lighting-service';
import CauldronQuests from './cauldron-quests';

jest.mock('@/app/[boardId]/[mapId]/game/game-state-lighting-service', () => ({
  __esModule: true,
  default: {
    update: jest.fn(),
  },
}));

jest.mock('@/lib/runner/cauldron-of-fire/server-actions', () => ({
  acceptCauldronQuest: jest.fn(),
  claimCauldronQuestReward: jest.fn(),
}));

jest.mock('../player-stats-sync.service', () => ({
  __esModule: true,
  default: {
    updateInventory: jest.fn(),
  },
}));

describe('CauldronQuests UI Component', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('auto-opens the dialog when arriving at a location with an available quest and accepts it', async () => {
    const player = createPlayer({ id: 'barbarian', location: { id: 22, description: '', move: [] } });
    const gameState = createGame({ gameId: 'cauldronfire', turn: 3, players: [player] });
    const quest = {
      id: 'q-1',
      templateId: 'retrieve-1',
      title: 'Stolen Sun Medallion',
      description: 'Find the Sun Medallion in Locations 18, 20.',
      category: 'retrieve_item' as const,
      scope: 'shared' as const,
      tier: 'early' as const,
      status: 'available' as const,
      offerLocation: 22,
      actualTargetLocation: 18,
      hintLocations: [18, 20],
      itemType: SpecialIds.questSunMedallion,
      reward: { coins: 50, points: 100 },
    };
    saveQuestsState(gameState, { quests: [quest] });

    jest.mocked(acceptCauldronQuest).mockResolvedValue({
      success: true,
      data: {
        gameState,
        quests: [{ ...quest, status: 'active' }],
        npcs: [],
        playerInventory: { equipped: null, equipment: [], hiredNpcIds: [] },
      },
    });

    render(
      <CauldronQuests
        boardId="b1"
        mapId="m1"
        player={player}
        gameState={gameState}
        processing={false}
      />,
    );

    // Auto-opened on render because location 22 has an available quest
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Stolen Sun Medallion')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Accept Quest' }));

    await waitFor(() => {
      expect(acceptCauldronQuest).toHaveBeenCalledWith('b1', 'm1', 'barbarian', 'q-1');
    });
    expect(playerStatsSyncService.updateInventory).toHaveBeenCalled();
  });

  it('only shows personal quests to the assigned character', () => {
    const barbarian = createPlayer({ id: 'barbarian', location: { id: 10, description: '', move: [] } });
    const mage = createPlayer({ id: 'mage', location: { id: 10, description: '', move: [] } });
    const gameState = createGame({ gameId: 'cauldronfire', turn: 2, players: [barbarian, mage] });
    saveQuestsState(gameState, {
      quests: [
        {
          id: 'q-barb',
          templateId: 'deliver-1',
          title: 'Barbarian War Axe Trial',
          description: 'Deliver the Royal Ledger.',
          category: 'deliver_item',
          scope: 'player',
          assignedPlayerId: 'barbarian',
          tier: 'early',
          status: 'available',
          offerLocation: 10,
          destinationLocation: 22,
          itemType: SpecialIds.questRoyalLedger,
          reward: { coins: 50, points: 100, itemId: EquipableIds.axeBattle },
        },
      ],
    });

    // Mage should NOT have the dialog auto-open or see the Barbarian's personal quest
    const { unmount } = render(
      <CauldronQuests
        boardId="b1"
        mapId="m1"
        player={mage}
        gameState={gameState}
        processing={false}
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Quests' }));
    expect(screen.queryByText('Barbarian War Axe Trial')).not.toBeInTheDocument();
    unmount();

    // Barbarian SHOULD see the personal quest and have it auto-open
    render(
      <CauldronQuests
        boardId="b1"
        mapId="m1"
        player={barbarian}
        gameState={gameState}
        processing={false}
      />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Barbarian War Axe Trial')).toBeInTheDocument();
    expect(screen.getByText(/\+ Battle Axe/i)).toBeInTheDocument();
  });

  it('shows active quests with objective guidance and allows claiming an item turn-in reward', async () => {
    const player = createPlayer({
      id: 'barbarian',
      location: { id: 22, description: '', move: [] },
      equipment: [{ id: 'i-55', type: SpecialIds.questSunMedallion }],
    });
    const gameState = createGame({ gameId: 'cauldronfire', turn: 4, players: [player] });
    const quest = {
      id: 'q-1',
      templateId: 'retrieve-1',
      title: 'Stolen Sun Medallion',
      description: 'Find the Sun Medallion in Locations 18, 20.',
      category: 'retrieve_item' as const,
      scope: 'shared' as const,
      tier: 'early' as const,
      status: 'active' as const,
      offerLocation: 22,
      actualTargetLocation: 18,
      hintLocations: [18, 20],
      itemType: SpecialIds.questSunMedallion,
      spawnedItemId: 'i-55',
      reward: { coins: 50, points: 100 },
    };
    saveQuestsState(gameState, { quests: [quest] });

    jest.mocked(claimCauldronQuestReward).mockResolvedValue({
      success: true,
      data: {
        gameState,
        quests: [{ ...quest, status: 'completed', completedByPlayerId: 'barbarian' }],
        npcs: [],
        playerInventory: { equipped: null, equipment: [], hiredNpcIds: [] },
      },
    });

    render(
      <CauldronQuests
        boardId="b1"
        mapId="m1"
        player={player}
        gameState={gameState}
        processing={false}
      />,
    );

    // Open manually via Quests button
    fireEvent.click(screen.getByRole('button', { name: 'Quests' }));

    expect(screen.getByText(/You have the Sunstone Medallion!/i)).toBeInTheDocument();
    const claimBtn = screen.getByRole('button', { name: 'Claim Reward' });
    fireEvent.click(claimBtn);

    await waitFor(() => {
      expect(claimCauldronQuestReward).toHaveBeenCalledWith('b1', 'm1', 'barbarian', 'q-1');
    });
  });

  it('renders the "Defeat the Lich King" main story quest visually distinct with crown icon and Main Story Quest badge', () => {
    const player = createPlayer({ id: 'barbarian', location: { id: 10, description: '', move: [] } });
    const gameState = createGame({ gameId: 'cauldronfire', turn: 1, players: [player] });
    saveQuestsState(gameState, {
      quests: [
        {
          id: 'q-side',
          templateId: 'side-1',
          title: 'Side Bounty',
          description: 'A regular side quest',
          category: 'clear_dungeon',
          scope: 'shared',
          tier: 'early',
          status: 'active',
          offerLocation: 10,
          reward: { coins: 30, points: 60 },
        },
        {
          id: 'quest-main-lich-king',
          templateId: 'main-defeat-lich-king',
          title: 'Defeat the Lich King',
          description: 'Storm the northern castle and destroy the Evil Lich King!',
          category: 'slay_boss',
          scope: 'shared',
          tier: 'late',
          status: 'active',
          isMainQuest: true,
          offerLocation: 224,
          actualTargetLocation: 224,
          reward: { coins: 500, points: 1000 },
        },
      ],
    });

    render(
      <CauldronQuests
        boardId="b1"
        mapId="m1"
        player={player}
        gameState={gameState}
        processing={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Quests' }));

    // Main story quest is rendered with "Main Story Quest" badge
    expect(screen.getByText('Main Story Quest')).toBeInTheDocument();
    expect(screen.getByText('Defeat the Lich King')).toBeInTheDocument();
    expect(screen.getByText('crown')).toBeInTheDocument();

    // Verify Main Story Quest is pinned at the top of the active quests list ahead of Side Bounty
    const titles = screen.getAllByText(/Defeat the Lich King|Side Bounty/).map(el => el.textContent);
    expect(titles[0]).toContain('Defeat the Lich King');
  });
});
