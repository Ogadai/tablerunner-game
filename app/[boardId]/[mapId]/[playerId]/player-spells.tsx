import { useState } from 'react';
import Swal from 'sweetalert2'
import { Dialog, Popover } from 'radix-ui';
import { getSpellActionCost, SpellIds, spells } from '@/lib/games/spells';
import styles from './player-spells.module.css';
import { PlayerAction, PlayerActionCast, PlayerActionsState, PlayerActionType, PlayerState } from '@/lib/store/types';
import { SpellDef, SpellTargetType } from '@/lib/games/types';
import EntityList, { EntityItemClass, EntityItemDetail } from './entity-list';
import { getSwalDefaultOptions } from '@/app/swal';

export default function PlayerSpells({
  playerSpells,
  player,
  entities,
  actionPointsLeft,
  actionsState,
  addNewAction
}: {
  playerSpells: SpellIds[],
  player: PlayerState,
  entities: EntityItemDetail[],
  actionPointsLeft: number,
  actionsState: PlayerActionsState,
  addNewAction: (opts: Omit<PlayerAction, 'id'>) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [targetSpell, setTargetSpell] = useState<SpellDef | null>(null);

  const magicUsed = actionsState.actions
    .filter(action => action.type === PlayerActionType.Cast)
    .reduce((total, spellAction) =>
      total + spells[(spellAction as PlayerActionCast).spellId].magicCost,
    0);
  const magicLeft = player.magic - magicUsed;

  const castSpell = async (spell: SpellDef, targetId?: string) => {
    await addNewAction({
      type: PlayerActionType.Cast,
      description: `Cast ${spell.name}`,
      spellId: spell.id,
      targetId,
    } as Omit<PlayerActionCast, 'id'>);
  };

  const onCastSpell = async (spellId: string) => {
    const spell = spells[spellId];
    setIsOpen(false);

    if (spell.pickTarget) {
      const targets = getTargetEntities(spell.targetType);

      if (targets.length === 0) {
        await Swal.fire({
          ...getSwalDefaultOptions(),
          title: 'Cannot cast spell!',
          icon: 'warning',
          text: "There are no targets here for this spell",
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
          (entity.className === EntityItemClass.self || entity.className === EntityItemClass.friendly);
      }
      if (targetType === SpellTargetType.enemy) {
        return entity.className === EntityItemClass.enemy && entity.health > 0;
      }
      return entity.health <= 0;
    });

  const targetEntities = targetSpell
    ? getTargetEntities(targetSpell.targetType)
    : [];

  const recentSpells: { spell: SpellDef, canCast: boolean }[]
      = (player.recentSpells || []).map(spellId => {
        const spell = spells[spellId];
        const actionCost = getSpellActionCost(spell, player.baseStats!.magic);
        const canCast = actionCost <= actionPointsLeft && spell.magicCost <= magicLeft;

        return { spell, canCast }
      });

  return (<>
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className={styles.spellsButton}>
          <span>Spells</span>
          <span className="material-symbols-outlined">wand_stars</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className={`DialogContent ${styles.spellsDialog}`}>
          <Dialog.Title className="DialogTitle">Spells</Dialog.Title>
          <div className="DialogContentBody">
            <ul className={styles.spellList}>
              {playerSpells.map(spellId => {
                const spell = spells[spellId];
                return spell ? <SpellIcon key={spell.id}
                  spell={spell}
                  player={player}
                  actionPointsLeft={actionPointsLeft}
                  magicLeft={magicLeft}
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
      { recentSpells.map(({spell, canCast}) =>
        <button
          key={spell.id}
          type="button"
          className={`${styles.spellIcon} ${canCast ? '' : styles.disabledSpellIcon}`}
          aria-label={spell.name}
          title={spell.name}
          style={{ backgroundPosition: `-${spell.iconXY.x * 40}px -${spell.iconXY.y * 40}px` }}
          onClick={() => onCastSpell(spell.id)}
        ></button>
      )}
    </div>

  </>);
}

function SpellIcon({
  spell,
  player,
  actionPointsLeft,
  magicLeft,
  onCast
}: {
  spell: (typeof spells)[string],
  player: PlayerState,
  actionPointsLeft: number,
  magicLeft: number,
  onCast: () => void
}) {
  const [isOpen, setIsOpen] = useState(false);
  const bonuses = Object.entries(spell.bonusStats || {}).filter(([, value]) => value !== undefined);
  const actionCost = getSpellActionCost(spell, player.baseStats!.magic);

  const canCast = actionCost <= actionPointsLeft && spell.magicCost <= magicLeft;
  const targetType = spell.pickTarget ? spell.targetType
    : (spell.targetType === SpellTargetType.enemy ? 'Multiple enemies' : 'Multiple friends');

  return (
    <li>
      <Popover.Root modal={true} open={isOpen} onOpenChange={setIsOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={styles.spellIcon}
            aria-label={spell.name}
            title={spell.name}
            style={{ backgroundPosition: `-${spell.iconXY.x * 80}px -${spell.iconXY.y * 80}px` }}
          />

        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className={`PopoverContent ${styles.spellPopover}`}>
            <h3>{spell.name}</h3>
            <ul>
              <li><span>Magic cost</span><strong>{spell.magicCost}</strong></li>
              <li><span>Action cost</span><strong>{actionCost}</strong></li>
              <li><span>Target</span><strong>{targetType}</strong></li>
              {bonuses.map(([stat, value]) => (
                <li key={stat}><span>{stat}</span><strong>{value}</strong></li>
              ))}
            </ul>
            { canCast && <div className={styles.spellButtons}>
              <button type="button" className="btn" onClick={onCast}>Cast</button>
            </div> }
            <Popover.Arrow className="PopoverArrow" width={15} height={10} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </li>
  );
}