import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SpecialIds } from '@/lib/games/items';
import { saveQuestsState } from '@/lib/runner/cauldron-of-fire/quests';
import { acceptCauldronQuest, claimCauldronQuestReward } from '@/lib/runner/cauldron-of-fire/server-actions';
import { createGame, createPlayer } from '@/lib/store/test-support/fixtures';
import playerStatsSyncService from '../player-stats-sync.service';
import CauldronQuests from './cauldron-quests';

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
    saveQuestsState(gameState, {
      quests: [
        {
          id: 'q-1',
          templateId: 'retrieve-1',
          title: 'Stolen Sun Medallion',
          description: 'Find the Sun Medallion in Locations 18, 20.',
          category: 'retrieve_item',
          scope: 'shared',
          tier: 'early',
          status: 'available',
          offerLocation: 22,
          actualTargetLocation: 18,
          hintLocations: [18, 20],
          itemType: SpecialIds.questSunMedallion,
          reward: { coins: 50, points: 100 },
        },
      ],
    });

    jest.mocked(acceptCauldronQuest).mockResolvedValue({
      success: true,
      data: {
        gameState,
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

  it('shows active quests with objective guidance and allows claiming an item turn-in reward', async () => {
    const player = createPlayer({
      id: 'barbarian',
      location: { id: 22, description: '', move: [] },
      equipment: [{ id: 'i-55', type: SpecialIds.questSunMedallion }],
    });
    const gameState = createGame({ gameId: 'cauldronfire', turn: 4, players: [player] });
    saveQuestsState(gameState, {
      quests: [
        {
          id: 'q-1',
          templateId: 'retrieve-1',
          title: 'Stolen Sun Medallion',
          description: 'Find the Sun Medallion in Locations 18, 20.',
          category: 'retrieve_item',
          scope: 'shared',
          tier: 'early',
          status: 'active',
          offerLocation: 22,
          actualTargetLocation: 18,
          hintLocations: [18, 20],
          itemType: SpecialIds.questSunMedallion,
          spawnedItemId: 'i-55',
          reward: { coins: 50, points: 100 },
        },
      ],
    });

    jest.mocked(claimCauldronQuestReward).mockResolvedValue({
      success: true,
      data: {
        gameState,
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
    fireEvent.click(screen.getByRole('button', { name: /Quests/i }));

    expect(screen.getByText(/You have the Sunstone Medallion!/i)).toBeInTheDocument();
    const claimBtn = screen.getByRole('button', { name: 'Claim Reward' });
    fireEvent.click(claimBtn);

    await waitFor(() => {
      expect(claimCauldronQuestReward).toHaveBeenCalledWith('b1', 'm1', 'barbarian', 'q-1');
    });
  });
});
