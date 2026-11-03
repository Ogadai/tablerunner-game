import { useState } from 'react';
import Swal from 'sweetalert2'
import { Dialog, Popover } from 'radix-ui';
import { canCharacterUseSpell, getCharacterType, getSpellActionCost, isCharacterSkillUser, isSkillSpell, SpellIds, spells } from '@/lib/games/spells';
import styles from './player-spells.module.css';
import { PlayerAction, PlayerActionAttack, PlayerActionCast, PlayerActionsState, PlayerActionType, PlayerState } from '@/lib/store/types';
import { EquipableItemDef, SpellDef, SpellTargetType } from '@/lib/games/types';
import EntityList, { EntityItemClass, EntityItemDetail } from './entity-list';
import { getSwalDefaultOptions } from '@/app/swal';
import EntityStats from './entity-base-stats';
import type { PlayerStats } from '@/lib/store/playerTurnStats';
import { allItems } from '@/lib/games/items';

export default function PlayerSpells({
  playerSpells,
  player,
  entities,
  playerStats,
  actionsState,
  addNewAction
}: {
  playerSpells: SpellIds[],
  player: PlayerState,
  entities: EntityItemDetail[],
  playerStats: PlayerStats;
  actionsState: PlayerActionsState;
  addNewAction: (opts: Omit<PlayerAction, 'id'>) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [targetSpell, setTargetSpell] = useState<SpellDef | null>(null);
  const [isAttackTargetOpen, setIsAttackTargetOpen] = useState(false);
  const isSkillUser = isCharacterSkillUser(getCharacterType(player));
  const actionLabel = isSkillUser ? 'Use' : 'Cast';
  const buttonLabel = isSkillUser ? 'Skills' : 'Spells';
  const buttonIcon = isSkillUser ? 'swords' : 'wand_stars';
  
  const castSpell = async (spell: SpellDef, targetId?: string) => {
    await addNewAction({
      type: PlayerActionType.Cast,
      description: `${isSkillSpell(spell) ? 'Use' : 'Cast'} ${spell.name}`,
      spellId: spell.id,
      targetId,
    } as Omit<PlayerActionCast, 'id'>);
  };

  const attackTargets = entities.filter(entity =>
    entity.className === EntityItemClass.enemy && entity.health > 0
  );

  const attackMonster = async (target: EntityItemDetail) => {
    setIsAttackTargetOpen(false);
    await addNewAction({
      type: PlayerActionType.Attack,
      description: `Attack ${target.name}`,
      target: target.id,
    } as Omit<PlayerActionAttack, 'id'>);
  };

  const onAttack = async () => {
    if (attackTargets.length === 1) {
      await attackMonster(attackTargets[0]);
      return;
    }

    setIsAttackTargetOpen(true);
  };

  const getSpellCooldownLeft = (spellId: string): number => {
    const spell = spells[spellId];
    const activeCooldown = player.spellCooldowns?.[spellId] ?? 0;
    if (activeCooldown > 0) return activeCooldown;
    if (spell?.cooldown && actionsState.actions.some(a => a.type === PlayerActionType.Cast && (a as PlayerActionCast).spellId === spellId)) {
      return spell.cooldown;
    }
    return 0;
  };

  const canCastSpell = (spellId: string) => {
    const spell = spells[spellId];
    if (getSpellCooldownLeft(spellId) > 0) {
      return false;
    }
    if (spell.pickTarget || spell.targetType === SpellTargetType.enemy) {
      const targets = getTargetEntities(spell.targetType);
      return targets.length > 0;
    }
    return true;
  }

  const onCastSpell = async (spellId: string) => {
    const spell = spells[spellId];
    setIsOpen(false);

    if (spell.pickTarget) {
      const targets = getTargetEntities(spell.targetType);

      if (targets.length === 0) {
        await Swal.fire({
          ...getSwalDefaultOptions(),
          title: `Cannot ${isSkillSpell(spell) ? 'use skill' : 'cast spell'}!`,
          icon: 'warning',
          text: `There are no targets here for this ${isSkillSpell(spell) ? 'skill' : 'spell'}`,
        });
        return;
      }

      if (targets.length === 1) {
        await castSpell(spell, targets[0].id);
        return;
      }

      setTargetSpell(spell);
      return;
    }

    await castSpell(spell);
  };

  const onSelectTarget = async (target: EntityItemDetail) => {
    if (!targetSpell) {
      return;
    }

    await castSpell(targetSpell, target.id);
    setTargetSpell(null);
  };

  const getTargetEntities = (targetType: SpellTargetType): EntityItemDetail[] => 
    entities.filter(entity => {
      if (targetType === SpellTargetType.friend) {
        return entity.health > 0 &&
          (entity.className === EntityItemClass.self
            || entity.className === EntityItemClass.friendly
            || entity.className === EntityItemClass.npc);
      }
      if (targetType === SpellTargetType.enemy) {
        return entity.className === EntityItemClass.enemy && entity.health > 0;
      }
      return entity.health <= 0;
    });

  const targetEntities = targetSpell
    ? getTargetEntities(targetSpell.targetType)
    : [];

  const actionPointsLeft = playerStats.actionPointsTotal- playerStats.actionPointsUsed;
  const canAttack = player.health > 0 && attackTargets.length > 0 && playerStats.actionsPerTurn.attack <= actionPointsLeft;
  const availableSpells = playerSpells.filter(spellId => canCharacterUseSpell(player, spells[spellId]));

  const recentSpellIds = [...new Set([
    ...actionsState.actions
      .filter((action): action is PlayerActionCast => action.type === PlayerActionType.Cast)
      .map(action => action.spellId)
      .reverse(),
    ...(player.recentSpells || []),
  ])].filter(spellId => canCharacterUseSpell(player, spells[spellId])).slice(0, 2);

  const recentSpells: { spell: SpellDef, canCast: boolean, cooldownLeft: number }[]
      = recentSpellIds.map(spellId => {
        const spell = spells[spellId];
        const actionCost = getSpellActionCost(spell, playerStats?.baseStats?.magic);
        const cooldownLeft = getSpellCooldownLeft(spellId);
        const canCast = player.health > 0 && actionCost <= actionPointsLeft && spell.magicCost <= playerStats.magicLeft
            && canCastSpell(spellId);

        return { spell, canCast, cooldownLeft }
      });

  const equippedWeapon = player.equipped.weapon && player.equipment.find(e => e.id ===player.equipped.weapon);
  const weaponItem = equippedWeapon ? allItems[equippedWeapon.type] as EquipableItemDef : null;
  const attackIconBackground = (weaponItem?.ranged)
    ? `0px -${5 * 40}px`
    : `-${6 * 40}px -${4 * 40}px`;

  return (<>
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className={styles.spellsButton} disabled={availableSpells.length === 0}>
          <span>{buttonLabel}</span>
          <span className="material-symbols-outlined">{buttonIcon}</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className={`DialogContent ${styles.spellsDialog}`}>
          <Dialog.Title className="DialogTitle">{buttonLabel}</Dialog.Title>
          <div className="DialogContentBody">
            {!isSkillUser && (
              <EntityStats
                current={{magic: playerStats.magic}}
                baseStats={playerStats.baseStats}
                statsList={['magic']}
              />
            )}

            <ul className={styles.spellList}>
              {availableSpells.map(spellId => {
                const spell = spells[spellId];
                return spell ? <SpellIcon key={spell.id}
                  spell={spell}
                  playerStats={playerStats}
                  actionPointsLeft={actionPointsLeft}
                  magicLeft={playerStats.magicLeft}
                  cooldownLeft={getSpellCooldownLeft(spell.id)}
                  actionLabel={actionLabel}
                  onCast={() => onCastSpell(spell.id)}
                /> : null;
              })}
            </ul>
          </div>
          <Dialog.Close className="DialogClose btn-secondary material-symbols-outlined" aria-label="Close">
            close
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    <Dialog.Root open={targetSpell !== null} onOpenChange={open => { if (!open) setTargetSpell(null); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className="DialogContent">
          <Dialog.Title className="DialogTitle">Choose a target</Dialog.Title>
          <div className="DialogContentBody">
            <EntityList entities={targetEntities} onClickEntity={onSelectTarget} />
          </div>
          <Dialog.Close className="DialogClose btn-secondary material-symbols-outlined" aria-label="Close">
            close
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>

    <div className={styles.recentSpells}>
      <Popover.Root modal={true} open={isAttackTargetOpen} onOpenChange={setIsAttackTargetOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={`${styles.spellIcon} ${canAttack ? '' : styles.disabledSpellIcon}`}
            disabled={!canAttack}
            aria-label="Attack"
            title="Attack"
            style={{ backgroundPosition: attackIconBackground }}
            onClick={onAttack}
          ></button>
        </Popover.Trigger>
        { attackTargets.length > 1 &&
          <Popover.Portal>
            <Popover.Content className="PopoverContent">
              <EntityList entities={attackTargets} onClickEntity={attackMonster} />
              <Popover.Arrow className="PopoverArrow" width={15} height={10} />
            </Popover.Content>
          </Popover.Portal>
        }
      </Popover.Root>
      { recentSpells.map(({spell, canCast, cooldownLeft}) =>
        <button
          key={spell.id}
          type="button"
          className={`${styles.spellIcon} ${canCast ? '' : styles.disabledSpellIcon}`}
          disabled={!canCast}
          aria-label={spell.name}
          title={spell.name}
          style={{ backgroundPosition: `-${spell.iconXY.x * 40}px -${spell.iconXY.y * 40}px` }}
          onClick={() => onCastSpell(spell.id)}
        >
          {cooldownLeft > 0 && <span className={styles.cooldownBadge}>{cooldownLeft}t</span>}
        </button>
      )}
    </div>

  </>);
}

function SpellIcon({
  spell,
  playerStats,
  actionPointsLeft,
  magicLeft,
  cooldownLeft,
  actionLabel,
  onCast
}: {
  spell: (typeof spells)[string],
  playerStats: PlayerStats,
  actionPointsLeft: number,
  magicLeft: number,
  cooldownLeft: number,
  actionLabel: string,
  onCast: () => void
}) {
  const [isOpen, setIsOpen] = useState(false);
  const bonuses = Object.entries(spell.bonusStats || {}).filter(([, value]) => value !== undefined);
  const actionCost = getSpellActionCost(spell, playerStats.baseStats!.magic);

  const canCast = cooldownLeft === 0 && actionCost <= actionPointsLeft && spell.magicCost <= magicLeft;
  const targetType = spell.selfOnly ? 'Self'
    : spell.pickTarget ? spell.targetType
    : (spell.targetType === SpellTargetType.enemy ? 'Multiple enemies' : 'Multiple friends');

  return (
    <li>
      <Popover.Root modal={true} open={isOpen} onOpenChange={setIsOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={`${styles.spellIcon} ${cooldownLeft > 0 ? styles.cooldownSpellIcon : ''}`}
            aria-label={spell.name}
            title={spell.name}
            style={{ backgroundPosition: `-${spell.iconXY.x * 80}px -${spell.iconXY.y * 80}px` }}
          >
            {cooldownLeft > 0 && <span className={styles.cooldownBadge}>{cooldownLeft}t</span>}
          </button>

        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className={`PopoverContent ${styles.spellPopover}`}>
            <h3>{spell.name}</h3>
            <ul>
              {spell.magicCost > 0 && <li><span>Magic cost</span><strong>{spell.magicCost}</strong></li>}
              <li><span>Action cost</span><strong>{actionCost}</strong></li>
              {spell.cooldown && (
                <li>
                  <span>Cooldown</span>
                  <strong>{cooldownLeft > 0 ? `${cooldownLeft}/${spell.cooldown}` : spell.cooldown}</strong>
                </li>
              )}
              <li><span>Target</span><strong>{targetType}</strong></li>
              {bonuses.map(([stat, value]) => (
                <li key={stat}><span>{stat}</span><strong>{value}</strong></li>
              ))}
            </ul>
            { canCast && <div className={styles.spellButtons}>
              <button type="button" className="btn" onClick={onCast}>{actionLabel}</button>
            </div> }
            <Popover.Arrow className="PopoverArrow" width={15} height={10} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </li>
  );
}
