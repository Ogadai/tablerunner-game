import { getMonsterStrength, getPointsForDamage, monsters } from './monsters';
import { getAvailableMonstersByStrength } from './monster-pack';

describe('monsters', () => {
  it('defines the Ghoul monster with valid properties', () => {
    const ghoul = monsters.ghoul;
    expect(ghoul).toBeDefined();
    expect(ghoul.id).toBe('ghoul');
    expect(ghoul.name).toBe('Ghoul');
    expect(ghoul.iconXY).toEqual({ x: 8, y: 4 });
    expect(ghoul.baseStats.attack).toBeGreaterThan(0);
    expect(ghoul.baseStats.damage).toBeGreaterThan(0);
    expect(ghoul.baseStats.defence).toBeGreaterThan(0);
    expect(ghoul.baseStats.health).toBeGreaterThan(0);
    expect(ghoul.baseStats.speed).toBeGreaterThan(0);
  });

  it('ensures Ghoul is slightly weaker than Skeleton', () => {
    const ghoul = monsters.ghoul;
    const skeleton = monsters.skeleton;

    const ghoulStrength = getMonsterStrength(ghoul);
    const skeletonStrength = getMonsterStrength(skeleton);

    expect(ghoulStrength).toBeLessThan(skeletonStrength);
    expect(ghoul.baseStats.attack).toBeLessThan(skeleton.baseStats.attack);
    expect(ghoul.baseStats.damage).toBeLessThan(skeleton.baseStats.damage);
    expect(ghoul.baseStats.defence).toBeLessThan(skeleton.baseStats.defence);
    expect(ghoul.baseStats.magic).toBeLessThan(skeleton.baseStats.magic);
    expect(ghoul.baseStats.health).toBeLessThan(skeleton.baseStats.health);
  });

  it('ensures Ghoul is stronger than a Zombie and a Rat', () => {
    const ghoulStrength = getMonsterStrength(monsters.ghoul);
    expect(ghoulStrength).toBeGreaterThan(getMonsterStrength(monsters.zombie));
    expect(ghoulStrength).toBeGreaterThan(getMonsterStrength(monsters.rat));
  });

  it('includes Ghoul in available monsters by strength for auto-population', () => {
    const available = getAvailableMonstersByStrength();
    const ghoulEntry = available.find(m => m.id === 'ghoul');
    expect(ghoulEntry).toBeDefined();
    expect(ghoulEntry?.strength).toBe(getMonsterStrength(monsters.ghoul));
  });

  it('calculates points for damage for a Ghoul', () => {
    const points = getPointsForDamage('ghoul', 5);
    expect(points).toBeGreaterThan(0);
    expect(points).toBeLessThan(getPointsForDamage('skeleton', 5));
  });

  it('defines Juvenile Mimic and Mimic with purely physical stats and excludes them from auto-populate', () => {
    const juvenileMimic = monsters.juvenilemimic;
    expect(juvenileMimic).toBeDefined();
    expect(juvenileMimic.id).toBe('juvenilemimic');
    expect(juvenileMimic.name).toBe('Juvenile Mimic');
    expect(juvenileMimic.iconXY).toEqual({ x: 9, y: 4 });
    expect(juvenileMimic.baseStats.magic).toBe(0);
    expect(juvenileMimic.spells).toBeUndefined();
    expect(juvenileMimic.baseStats.attack).toBeGreaterThan(monsters.scorpion.baseStats.attack);
    expect(juvenileMimic.baseStats.attack).toBeLessThan(monsters.zombie.baseStats.attack);

    const mimic = monsters.mimic;
    expect(mimic).toBeDefined();
    expect(mimic.id).toBe('mimic');
    expect(mimic.name).toBe('Mimic');
    expect(mimic.iconXY).toEqual({ x: 0, y: 5 });
    expect(mimic.baseStats.magic).toBe(0);
    expect(mimic.spells).toBeUndefined();
    expect(getMonsterStrength(mimic)).toBeGreaterThan(getMonsterStrength(monsters.ogre));
    expect(getMonsterStrength(mimic)).toBeLessThan(getMonsterStrength(monsters.cyclops));

    const available = getAvailableMonstersByStrength();
    expect(available.find(m => m.id === 'juvenilemimic')).toBeUndefined();
    expect(available.find(m => m.id === 'mimic')).toBeUndefined();
  });
});

