/** @jest-environment node */
import { SpecialIds } from '@/lib/games/items';
import { GameTopicMessageType } from '@/lib/message-types';
import { publishMessage } from '@/lib/messages/message-publisher';
import {
  getGameStateFromRedis,
  getLocationsStateFromRedis,
  getPlayerInventoryFromRedis,
  lockGameStateInRedis,
  lockLocationsStateInRedis,
  setGameStateInRedis,
  setLocationsStateInRedis,
  setPlayerInventoryInRedis,
} from '@/lib/store/redis-access';
import { createGame, createLocations, createPlayer } from '@/lib/store/test-support/fixtures';
import { getQuestsState, QUEST_LED_OWNER, QUEST_LED_RGB, saveQuestsState } from './quests';
import { acceptCauldronQuest, claimCauldronQuestReward } from './server-actions';

jest.mock('@/lib/messages/message-publisher', () => ({
  publishMessage: jest.fn(),
}));

jest.mock('@/lib/store/redis-access', () => ({
  getGameStateFromRedis: jest.fn(),
  getLocationsStateFromRedis: jest.fn(),
  getPlayerInventoryFromRedis: jest.fn(),
  lockGameStateInRedis: jest.fn(),
  lockLocationsStateInRedis: jest.fn(),
  setGameStateInRedis: jest.fn(),
  setLocationsStateInRedis: jest.fn(),
  setPlayerInventoryInRedis: jest.fn(),
}));

describe('Cauldron of Fire Quest Server Actions', () => {
  const releaseGameLock = jest.fn();
  const releaseLocationsLock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(lockGameStateInRedis).mockResolvedValue(releaseGameLock);
    jest.mocked(lockLocationsStateInRedis).mockResolvedValue(releaseLocationsLock);
    jest.mocked(publishMessage).mockResolvedValue();
  });

  it('accepts an available quest at the player location without broadcasting GameStateUpdated', async () => {
    const player = createPlayer({ id: 'barbarian', location: { id: 10, description: '', move: [] } });
    const gameState = createGame({ gameId: 'cauldronfire', players: [player] });
    const locationsState = createLocations();
    const inventory = { equipped: null, equipment: null, hiredNpcIds: [] };

    saveQuestsState(gameState, {
      quests: [
        {
          id: 'q-1',
          templateId: 'deliver-1',
          title: 'Deliver Ledger',
          description: 'Deliver ledger to 22.',
          category: 'deliver_item',
          scope: 'player',
          assignedPlayerId: 'barbarian',
          tier: 'early',
          status: 'available',
          offerLocation: 10,
          destinationLocation: 22,
          itemType: SpecialIds.questRoyalLedger,
          reward: { coins: 40, points: 80 },
        },
      ],
    });

    jest.mocked(getGameStateFromRedis).mockResolvedValue(gameState);
    jest.mocked(getLocationsStateFromRedis).mockResolvedValue(locationsState);
    jest.mocked(getPlayerInventoryFromRedis).mockResolvedValue(inventory);

    const res = await acceptCauldronQuest('board-1', 'map-1', 'barbarian', 'q-1');
    expect(res.success).toBe(true);
    expect(getQuestsState(res.data!.gameState).quests[0].status).toBe('active');
    expect(res.data?.playerInventory?.equipment).toContainEqual(
      expect.objectContaining({ type: SpecialIds.questRoyalLedger }),
    );
    expect(setPlayerInventoryInRedis).toHaveBeenCalled();
    expect(setLocationsStateInRedis).toHaveBeenCalled();
    expect(setGameStateInRedis).toHaveBeenCalledWith('board-1', 'map-1', gameState, { notify: false });
    expect(publishMessage).toHaveBeenCalledWith(
      'board-1',
      'map-1',
      expect.objectContaining({
        type: GameTopicMessageType.QuestsUpdated,
        leds: expect.arrayContaining([
          expect.objectContaining({
            location: 22,
            owner: QUEST_LED_OWNER,
            rgb: QUEST_LED_RGB,
          }),
        ]),
      }),
    );
    expect(res.data?.leds).toContainEqual(
      expect.objectContaining({
        location: 22,
        owner: QUEST_LED_OWNER,
        rgb: QUEST_LED_RGB,
      }),
    );
    expect(releaseLocationsLock).toHaveBeenCalled();
    expect(releaseGameLock).toHaveBeenCalled();
  });

  it('claims reward mid-turn when player has quest item at turn-in location', async () => {
    const player = createPlayer({
      id: 'barbarian',
      location: { id: 22, description: '', move: [] },
      equipment: [{ id: 'i-99', type: SpecialIds.questRoyalLedger }],
      coins: 10,
      points: 0,
    });
    const gameState = createGame({ gameId: 'cauldronfire', players: [player] });
    const locationsState = createLocations();
    const inventory = {
      equipped: null,
      equipment: [{ id: 'i-99', type: SpecialIds.questRoyalLedger }],
      hiredNpcIds: [],
    };

    saveQuestsState(gameState, {
      quests: [
        {
          id: 'q-1',
          templateId: 'deliver-1',
          title: 'Deliver Ledger',
          description: 'Deliver ledger to 22.',
          category: 'deliver_item',
          scope: 'player',
          assignedPlayerId: 'barbarian',
          tier: 'early',
          status: 'active',
          offerLocation: 10,
          destinationLocation: 22,
          itemType: SpecialIds.questRoyalLedger,
          spawnedItemId: 'i-99',
          reward: { coins: 40, points: 80 },
        },
      ],
    });

    jest.mocked(getGameStateFromRedis).mockResolvedValue(gameState);
    jest.mocked(getLocationsStateFromRedis).mockResolvedValue(locationsState);
    jest.mocked(getPlayerInventoryFromRedis).mockResolvedValue(inventory);

    const res = await claimCauldronQuestReward('board-1', 'map-1', 'barbarian', 'q-1');
    expect(res.success).toBe(true);
    expect(getQuestsState(res.data!.gameState).quests[0].status).toBe('completed');
    expect(res.data?.playerInventory?.equipment).toHaveLength(0);
    expect(res.data?.playerInventory?.coins).toBe(50);
    expect(player.coins).toBe(50);
    expect(setGameStateInRedis).toHaveBeenCalledWith('board-1', 'map-1', gameState, { notify: false });
  });
});
