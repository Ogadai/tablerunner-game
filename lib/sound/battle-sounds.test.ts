import {
  getCombatEventRelativeUrl,
  getCombatEventSound,
  playCombatSound,
  stopAllCombatSounds,
  unlockAudio,
} from './battle-sounds';
import { CombatEvent } from '../store/types';

describe('battle-sounds', () => {
  it('returns potion drink sound for item actions', () => {
    const itemEvent: CombatEvent = {
      id: 'e1',
      initiatorId: 'p1',
      initiatorName: 'Hero',
      actionType: 'item',
      actionName: 'Minor Healing Potion',
      icon: { sheet: 'item', iconXY: { x: 0, y: 0 } },
      targets: [],
    };
    expect(getCombatEventRelativeUrl(itemEvent)).toBe('/game-sounds/potion-drink.mp3');
    expect(getCombatEventSound(itemEvent)).toContain('/game-sounds/potion-drink.mp3');

    const elixirEvent: CombatEvent = {
      ...itemEvent,
      actionName: 'Mighty Elixir',
    };
    expect(getCombatEventRelativeUrl(elixirEvent)).toBe('/game-sounds/potion-drink.mp3');
  });

  it('distinguishes between sword clash and bow twang for attacks', () => {
    const meleeEvent: CombatEvent = {
      id: 'e2',
      initiatorId: 'p1',
      initiatorName: 'Hero',
      actionType: 'attack',
      actionName: 'Sword Strike',
      icon: { sheet: 'spell', iconXY: { x: 6, y: 4 } },
      targets: [],
    };
    expect(getCombatEventRelativeUrl(meleeEvent)).toBe('/game-sounds/sword-clash.mp3');

    const rangedEvent: CombatEvent = {
      id: 'e3',
      initiatorId: 'p2',
      initiatorName: 'Archer',
      actionType: 'attack',
      actionName: 'Bow Shot',
      icon: { sheet: 'spell', iconXY: { x: 0, y: 5 } },
      targets: [],
    };
    expect(getCombatEventRelativeUrl(rangedEvent)).toBe('/game-sounds/bow-twang.mp3');
  });

  it('maps barbarian special actions correctly', () => {
    const actions = [
      { name: 'Rage', sound: '/game-sounds/barbarian-rage.mp3' },
      { name: 'Mighty Cleave', sound: '/game-sounds/barbarian-mighty-cleave.mp3' },
      { name: 'War Cry', sound: '/game-sounds/barbarian-war-cry.mp3' },
      { name: 'Iron Skin', sound: '/game-sounds/barbarian-iron-skin.mp3' },
      { name: 'Whirlwind', sound: '/game-sounds/barbarian-whirlwind.mp3' },
      { name: 'Bloodthirst', sound: '/game-sounds/barbarian-bloodthirst.mp3' },
      { name: 'Berserker', sound: '/game-sounds/barbarian-berserker.mp3' },
    ];

    for (const act of actions) {
      const event: CombatEvent = {
        id: 'e',
        initiatorId: 'barb',
        initiatorName: 'Barbarian',
        actionType: 'spell',
        actionName: act.name,
        icon: { sheet: 'spell', iconXY: { x: 0, y: 0 } },
        targets: [],
      };
      expect(getCombatEventRelativeUrl(event)).toBe(act.sound);
    }
  });

  it('maps ranger special actions correctly', () => {
    const actions = [
      { name: 'Focus', sound: '/game-sounds/ranger-focus.mp3' },
      { name: 'Pinning Shot', sound: '/game-sounds/ranger-pinning-shot.mp3' },
      { name: 'Evasive Step', sound: '/game-sounds/ranger-evasive-step.mp3' },
      { name: 'Multi-Shot', sound: '/game-sounds/ranger-multi-shot.mp3' },
      { name: 'Poison Arrow', sound: '/game-sounds/ranger-poison-arrow.mp3' },
      { name: 'Sniper Shot', sound: '/game-sounds/ranger-sniper-shot.mp3' },
      { name: 'Call Companion', sound: '/game-sounds/ranger-call-companion.mp3' },
    ];

    for (const act of actions) {
      const event: CombatEvent = {
        id: 'e',
        initiatorId: 'ranger',
        initiatorName: 'Ranger',
        actionType: 'spell',
        actionName: act.name,
        icon: { sheet: 'spell', iconXY: { x: 0, y: 0 } },
        targets: [],
      };
      expect(getCombatEventRelativeUrl(event)).toBe(act.sound);
    }
  });

  it('maps diverse spells correctly', () => {
    const spellsToTest = [
      { name: 'Fire Ball', sound: '/game-sounds/fireball.mp3' },
      { name: 'Ice Shards', sound: '/game-sounds/ice-shards.mp3' },
      { name: 'Heal', sound: '/game-sounds/heal.mp3' },
      { name: 'Lightning', sound: '/game-sounds/lightning.mp3' },
      { name: 'Raise Dead', sound: '/game-sounds/raise-dead.mp3' },
      { name: 'Time Warp', sound: '/game-sounds/time-warp.mp3' },
      { name: 'Fire Breath', sound: '/game-sounds/fire-breath.mp3' },
    ];

    for (const s of spellsToTest) {
      const event: CombatEvent = {
        id: 'e',
        initiatorId: 'mage',
        initiatorName: 'Mage',
        actionType: 'spell',
        actionName: s.name,
        icon: { sheet: 'spell', iconXY: { x: 0, y: 0 } },
        targets: [],
      };
      expect(getCombatEventRelativeUrl(event)).toBe(s.sound);
    }
  });

  it('handles playCombatSound, stopAllCombatSounds, and unlockAudio gracefully in tests without throwing', () => {
    expect(() => playCombatSound('/game-sounds/heal.mp3')).not.toThrow();
    expect(() => playCombatSound(null)).not.toThrow();
    expect(() => stopAllCombatSounds()).not.toThrow();
    expect(() => unlockAudio()).not.toThrow();
  });

  describe('base URL resolution', () => {
    const originalEnv = process.env;
    const sampleEvent: CombatEvent = {
      id: 'e-url',
      initiatorId: 'p1',
      initiatorName: 'Hero',
      actionType: 'item',
      actionName: 'Potion',
      icon: { sheet: 'item', iconXY: { x: 0, y: 0 } },
      targets: [],
    };

    beforeEach(() => {
      process.env = { ...originalEnv };
      delete process.env.LOCATION_IMAGE_BASE_URL;
      delete process.env.NEXT_PUBLIC_LOCATION_IMAGE_BASE_URL;
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('uses NEXT_PUBLIC_LOCATION_IMAGE_BASE_URL in client environments and strips trailing slashes', () => {
      process.env.NEXT_PUBLIC_LOCATION_IMAGE_BASE_URL = 'https://pub-example.r2.dev/';
      expect(getCombatEventSound(sampleEvent)).toBe('https://pub-example.r2.dev/game-sounds/potion-drink.mp3');
    });

    it('uses LOCATION_IMAGE_BASE_URL when set', () => {
      process.env.LOCATION_IMAGE_BASE_URL = 'https://custom-r2.example.com/';
      expect(getCombatEventSound(sampleEvent)).toBe('https://custom-r2.example.com/game-sounds/potion-drink.mp3');
    });

    it('falls back to the default blob URL when neither env var is set', () => {
      expect(getCombatEventSound(sampleEvent)).toBe(
        'https://eivregtw0c7oknqs.public.blob.vercel-storage.com/game-sounds/potion-drink.mp3'
      );
    });
  });
});

