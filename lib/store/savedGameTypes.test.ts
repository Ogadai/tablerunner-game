import { savedGameSchema, validateGameScope } from './savedGameTypes';
import { createSave } from './test-support/fixtures';

it('accepts a versioned save while preserving arbitrary nested Redis data', () => {
  const save = createSave();
  expect(savedGameSchema.parse(save)).toEqual(save);
});

it.each([
  ['schemaVersion', 2], ['metadata', {}], ['redisState', { game: null }],
  ['redisState', { game: [] }], ['redisState', { game: 'serialized JSON' }],
])('rejects invalid %s: %j', (field, value) => {
  expect(savedGameSchema.safeParse({ ...createSave(), [field]: value }).success).toBe(false);
});

it.each([
  ['id', 'not-a-uuid'], ['savedAt', 'yesterday'], ['savedAt', '2026-02-30T12:00:00Z'],
  ['saveName', ''], ['playerCount', -1], ['playerCount', 1.5], ['turn', -1], ['turn', 0.5], ['turn', '3'],
])('rejects invalid metadata %s: %j', (field, value) => {
  const save = createSave();
  expect(savedGameSchema.safeParse({ ...save, metadata: { ...save.metadata, [field]: value } }).success).toBe(false);
});

it('allows a turn-zero game with no players', () => {
  const save = createSave();
  save.metadata.playerCount = 0;
  save.metadata.turn = 0;
  expect(savedGameSchema.safeParse(save).success).toBe(true);
});

it.each([['', 'map'], ['board', ' '], ['a:b', 'map'], ['board', 'a:b'], [null, 'map'], ['board', 1]])('rejects ambiguous or missing scope %j / %j', (board, map) => {
  expect(() => validateGameScope(board as string, map as string)).toThrow('A valid board ID and map ID are required');
});

it('allows scope characters that storage layers must escape', () => {
  expect(() => validateGameScope('board /?*[]', 'map %雪')).not.toThrow();
});
