import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import QuestsTopicService from '@/app/message-bus/quests-topic-service';
import { getGameTopicId, GameTopicMessageType } from '@/lib/message-types';
import { EquipableIds, SpecialIds } from '@/lib/games/items';
import { saveQuestsState } from '@/lib/runner/cauldron-of-fire/quests';
import { acceptCauldronQuest, claimCauldronQuestReward } from '@/lib/runner/cauldron-of-fire/server-actions';
import { createGame, createPlayer } from '@/lib/store/test-support/fixtures';
import playerStatsSyncService from '../player-stats-sync.service';
import gameStateLightingService from '@/app/[boardId]/[mapId]/game/game-state-lighting-service';
import CauldronQuests, { formatLocations } from './cauldron-quests';

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
          hintLocations: [224],
          bossName: 'The Evil Lich King',
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

    // Main story quest removes description line to save space, but keeps task line with singular Location
    expect(screen.queryByText('Storm the northern castle and destroy the Evil Lich King!')).toBeNull();
    expect(screen.getByText(/Track down and defeat The Evil Lich King in Location 224/i)).toBeInTheDocument();
    expect(screen.queryByText(/Locations 224/i)).toBeNull();

    // Main story quest removes the reward coins and XP line
    expect(screen.queryByText('+1000 XP')).toBeNull();
    expect(screen.queryByText('500')).toBeNull();

    // Regular active quest preserves its description and reward row
    expect(screen.getByText('A regular side quest')).toBeInTheDocument();
    expect(screen.getByText('+60 XP')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('keeps the quests popup open for other players when a quest is accepted via real-time update', () => {
    const mage = createPlayer({ id: 'mage', location: { id: 22, description: '', move: [] } });
    const barbarian = createPlayer({ id: 'barbarian', location: { id: 22, description: '', move: [] } });
    const gameState = createGame({ gameId: 'cauldronfire', turn: 3, players: [mage, barbarian] });
    const quest = {
      id: 'q-shared',
      templateId: 'retrieve-1',
      title: 'Shared Sun Medallion',
      description: 'Find the Sun Medallion.',
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

    render(
      <CauldronQuests
        boardId="b1"
        mapId="m1"
        player={mage}
        gameState={gameState}
        processing={false}
      />,
    );

    // Mage auto-opens because of available quest at location 22
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Shared Sun Medallion')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept Quest' })).toBeEnabled();

    // Barbarian accepts the quest, broadcasting QuestsUpdated
    act(() => {
      QuestsTopicService.raiseQuestsUpdated(getGameTopicId('b1', 'm1'), {
        type: GameTopicMessageType.QuestsUpdated,
        quests: [{ ...quest, status: 'active' }],
        npcs: [],
      });
    });

    // The Quests popup MUST stay open for Mage, and keep the quest in "...at location" with a disabled Accepted button
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accepted' })).toBeDisabled();

    // Closing and re-opening the popup moves it to Active Quests
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Quests' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('keeps the quests popup open continuously without closing when the player accepts a quest', async () => {
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

    // Mock acceptCauldronQuest to simulate the QuestsUpdated message arriving before the HTTP response returns
    let resolveAction!: (val: any) => void;
    jest.mocked(acceptCauldronQuest).mockImplementation(() => {
      return new Promise(resolve => {
        resolveAction = resolve;
      });
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

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Accept Quest' }));

    // While request is in-flight, QuestsUpdated arrives via message bus
    act(() => {
      QuestsTopicService.raiseQuestsUpdated(getGameTopicId('b1', 'm1'), {
        type: GameTopicMessageType.QuestsUpdated,
        quests: [{ ...quest, status: 'active' }],
        npcs: [],
      });
    });

    // Dialog must STILL be open (never closed!) and keep quest in location section with disabled Accepted button
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accepted' })).toBeDisabled();

    // Now server response resolves
    await act(async () => {
      resolveAction({
        success: true,
        data: {
          gameState,
          quests: [{ ...quest, status: 'active' }],
          npcs: [],
          playerInventory: { equipped: null, equipment: [], hiredNpcIds: [] },
        },
      });
    });

    // Dialog remains open and keeps quest in location section with disabled Accepted button
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accepted' })).toBeDisabled();

    // Closing and re-opening the popup moves it to Active Quests
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Quests' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('keeps the accepted quest in place when multiple quests exist at location', async () => {
    const player = createPlayer({ id: 'barbarian', location: { id: 22, description: '', move: [] } });
    const gameState = createGame({ gameId: 'cauldronfire', turn: 1, players: [player] });
    const quest1 = {
      id: 'q-1',
      templateId: 'retrieve-1',
      title: 'First Quest',
      description: 'First quest description',
      category: 'retrieve_item' as const,
      scope: 'shared' as const,
      tier: 'early' as const,
      status: 'available' as const,
      offerLocation: 22,
      reward: { coins: 50, points: 100 },
    };
    const quest2 = {
      id: 'q-2',
      templateId: 'retrieve-2',
      title: 'Second Quest',
      description: 'Second quest description',
      category: 'retrieve_item' as const,
      scope: 'shared' as const,
      tier: 'early' as const,
      status: 'available' as const,
      offerLocation: 22,
      reward: { coins: 30, points: 60 },
    };
    saveQuestsState(gameState, { quests: [quest1, quest2] });

    jest.mocked(acceptCauldronQuest).mockResolvedValue({
      success: true,
      data: {
        gameState,
        quests: [{ ...quest1, status: 'active' }, quest2],
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

    const acceptButtons = screen.getAllByRole('button', { name: 'Accept Quest' });
    expect(acceptButtons).toHaveLength(2);

    // Accept first quest
    fireEvent.click(acceptButtons[0]);

    await waitFor(() => {
      expect(acceptCauldronQuest).toHaveBeenCalledWith('b1', 'm1', 'barbarian', 'q-1');
    });

    // Still in location section: first quest is disabled "Accepted", second quest is still "Accept Quest"
    expect(screen.getByRole('button', { name: 'Accepted' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Accept Quest' })).toBeEnabled();

    // Titles remain in original order
    const titles = screen.getAllByText(/First Quest|Second Quest/).map(el => el.textContent);
    expect(titles[0]).toBe('First Quest');
    expect(titles[1]).toBe('Second Quest');

    // Close and re-open
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quests' }));
  });
});

describe('formatLocations helper', () => {
  it('correctly uses singular "Location" for a single location with compass hint', () => {
    const formatted = formatLocations([32], 10);
    expect(formatted).toMatch(/^Location 32/);
    expect(formatted).toContain('(');
  });

  it('correctly uses plural "Locations" for multiple locations with compass hints', () => {
    const formatted = formatLocations([24, 35], 10);
    expect(formatted).toMatch(/^Locations 24 \([A-Z]+\), 35 \([A-Z]+\)$/);
  });

  it('correctly uses singular "Location" without compass hint when fromLocation is omitted', () => {
    expect(formatLocations([32])).toBe('Location 32');
  });

  it('correctly uses plural "Locations" without compass hint when fromLocation is omitted', () => {
    expect(formatLocations([24, 35])).toBe('Locations 24, 35');
  });

  it('falls back to "Locations" for empty or undefined arrays', () => {
    expect(formatLocations([])).toBe('Locations');
    expect(formatLocations(undefined)).toBe('Locations');
  });
});
