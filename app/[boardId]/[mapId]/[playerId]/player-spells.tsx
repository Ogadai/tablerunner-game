import { useState } from 'react';
import { Dialog, Popover } from 'radix-ui';
import { getSpellActionCost, SpellIds, spells } from '@/lib/games/spells';
import styles from './player-spells.module.css';
import { PlayerActionCast, PlayerActionsState, PlayerActionType, PlayerState } from '@/lib/store/types';

export default function PlayerSpells({
  playerSpells,
  player,
  actionPointsLeft,
  actionsState
}: {
  playerSpells: SpellIds[],
  player: PlayerState,
  actionPointsLeft: number,
  actionsState: PlayerActionsState,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const magicUsed = actionsState.actions
    .filter(action => action.type === PlayerActionType.Cast)
    .reduce((total, spellAction) =>
      total + spells[(spellAction as PlayerActionCast).spellId].magicCost,
    0);
  const magicLeft = player.magic - magicUsed;

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <button type="button">
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
  );
}

function SpellIcon({
  spell,
  player,
  actionPointsLeft,
  magicLeft
}: {
  spell: (typeof spells)[string],
  player: PlayerState,
  actionPointsLeft: number,
  magicLeft: number,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const bonuses = Object.entries(spell.bonusStats || {}).filter(([, value]) => value !== undefined);
  const actionCost = getSpellActionCost(spell, player.baseStats!.magic);

  const canCast = actionCost <= actionPointsLeft && spell.magicCost <= magicLeft;

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
              <li><span>Target</span><strong>{spell.targetType}</strong></li>
              {bonuses.map(([stat, value]) => (
                <li key={stat}><span>{stat}</span><strong>{value}</strong></li>
              ))}
            </ul>
            { canCast && <div className={styles.spellButtons}>
              <button type="button" className="btn">Cast</button>
            </div> }
            <Popover.Arrow className="PopoverArrow" width={15} height={10} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </li>
  );
}