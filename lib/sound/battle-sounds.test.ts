import { getCombatEventSound, playCombatSound, stopAllCombatSounds } from './battle-sounds';
import { CombatEvent } from '../store/types';

describe('battle-sounds', () => {
  it('returns potion drink sound for item actions', () => {
    const itemEvent: CombatEvent = {
      id: 'e1',
      initiatorId: 'p1',
      initiatorName: 'Hero',
      actionType: 'item',
      actionName: 'Minor Healing Potion',
      targets: [],
    };
    expect(getCombatEventSound(itemEvent)).toBe('/sounds/potion-drink.mp3');

    const elixirEvent: CombatEvent = {
      ...itemEvent,
      actionName: 'Mighty Elixir',
    };
    expect(getCombatEventSound(elixirEvent)).toBe('/sounds/potion-drink.mp3');
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
    expect(getCombatEventSound(meleeEvent)).toBe('/sounds/sword-clash.mp3');

    const rangedEvent: CombatEvent = {
      id: 'e3',
      initiatorId: 'p2',
      initiatorName: 'Archer',
      actionType: 'attack',
      actionName: 'Bow Shot',
      icon: { sheet: 'spell', iconXY: { x: 0, y: 5 } },
      targets: [],
    };
    expect(getCombatEventSound(rangedEvent)).toBe('/sounds/bow-twang.mp3');
  });

  it('maps barbarian special actions correctly', () => {
    const actions = [
      { name: 'Rage', sound: '/sounds/barbarian-rage.mp3' },
      { name: 'Mighty Cleave', sound: '/sounds/barbarian-mighty-cleave.mp3' },
      { name: 'War Cry', sound: '/sounds/barbarian-war-cry.mp3' },
      { name: 'Iron Skin', sound: '/sounds/barbarian-iron-skin.mp3' },
      { name: 'Whirlwind', sound: '/sounds/barbarian-whirlwind.mp3' },
      { name: 'Bloodthirst', sound: '/sounds/barbarian-bloodthirst.mp3' },
      { name: 'Berserker', sound: '/sounds/barbarian-berserker.mp3' },
    ];

    for (const act of actions) {
      const event: CombatEvent = {
        id: 'e',
        initiatorId: 'barb',
        initiatorName: 'Barbarian',
        actionType: 'spell',
        actionName: act.name,
        targets: [],
      };
      expect(getCombatEventSound(event)).toBe(act.sound);
    }
  });

  it('maps ranger special actions correctly', () => {
    const actions = [
      { name: 'Focus', sound: '/sounds/ranger-focus.mp3' },
      { name: 'Pinning Shot', sound: '/sounds/ranger-pinning-shot.mp3' },
      { name: 'Evasive Step', sound: '/sounds/ranger-evasive-step.mp3' },
      { name: 'Multi-Shot', sound: '/sounds/ranger-multi-shot.mp3' },
      { name: 'Poison Arrow', sound: '/sounds/ranger-poison-arrow.mp3' },
      { name: 'Sniper Shot', sound: '/sounds/ranger-sniper-shot.mp3' },
      { name: 'Call Companion', sound: '/sounds/ranger-call-companion.mp3' },
    ];

    for (const act of actions) {
      const event: CombatEvent = {
        id: 'e',
        initiatorId: 'ranger',
        initiatorName: 'Ranger',
        actionType: 'spell',
        actionName: act.name,
        targets: [],
      };
      expect(getCombatEventSound(event)).toBe(act.sound);
    }
  });

  it('maps diverse spells correctly', () => {
    const spellsToTest = [
      { name: 'Fire Ball', sound: '/sounds/fireball.mp3' },
      { name: 'Ice Shards', sound: '/sounds/ice-shards.mp3' },
      { name: 'Heal', sound: '/sounds/heal.mp3' },
      { name: 'Lightning', sound: '/sounds/lightning.mp3' },
      { name: 'Raise Dead', sound: '/sounds/raise-dead.mp3' },
      { name: 'Time Warp', sound: '/sounds/time-warp.mp3' },
      { name: 'Fire Breath', sound: '/sounds/fire-breath.mp3' },
    ];

    for (const s of spellsToTest) {
      const event: CombatEvent = {
        id: 'e',
        initiatorId: 'mage',
        initiatorName: 'Mage',
        actionType: 'spell',
        actionName: s.name,
        targets: [],
      };
      expect(getCombatEventSound(event)).toBe(s.sound);
    }
  });

  it('handles playCombatSound and stopAllCombatSounds gracefully in tests without throwing', () => {
    expect(() => playCombatSound('/sounds/heal.mp3')).not.toThrow();
    expect(() => playCombatSound(null)).not.toThrow();
    expect(() => stopAllCombatSounds()).not.toThrow();
  });
});

