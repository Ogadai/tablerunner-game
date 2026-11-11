import type { ComponentProps } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { allItems } from '@/lib/games/items';
import { SpellIds } from '@/lib/games/spells';
import { type ConsumableItemDef, PlayerItemType } from '@/lib/games/types';
import InventoryItem from './inventory-item';
import { makeBaseStats } from './test-fixtures';

const consumable = Object.values(allItems).find(item => item.type === PlayerItemType.consumable) as ConsumableItemDef;

function setup(overrides: Partial<ComponentProps<typeof InventoryItem>> = {}) {
  const props = {
    isSelf: true, isDead: false, item: { id: 'sword-1', type: 'swordRusty' },
    isEquipped: false, isUsed: false, actionPointsLeft: 20, baseStats: makeBaseStats(),
    onEquipped: jest.fn(), onUsed: jest.fn(), onDropped: jest.fn(), onLearnScroll: jest.fn(),
    ...overrides,
  };
  render(<InventoryItem {...props} />);
  fireEvent.click(screen.getByRole('button', { name: allItems[props.item.type].name }));
  return props;
}

describe('InventoryItem', () => {
  it.each(['Give', 'Take'] as const)('calls the supplied %s action', action => {
    const onGive = jest.fn();
    const onTake = jest.fn();
    setup({ onGive, onTake });
    fireEvent.click(screen.getByRole('button', { name: action }));
    expect(action === 'Give' ? onGive : onTake).toHaveBeenCalledTimes(1);
    expect(action === 'Give' ? onTake : onGive).not.toHaveBeenCalled();
  });

  it.each(['Give', 'Take', undefined] as const)('only offers the supplied optional action: %s', action => {
    setup({ onGive: action === 'Give' ? jest.fn() : undefined, onTake: action === 'Take' ? jest.fn() : undefined });
    if (action) expect(screen.getByRole('button', { name: action })).toBeInTheDocument();
    if (action !== 'Give') expect(screen.queryByRole('button', { name: 'Give' })).not.toBeInTheDocument();
    if (action !== 'Take') expect(screen.queryByRole('button', { name: 'Take' })).not.toBeInTheDocument();
  });

  it.each([{ isSelf: false }, { isDead: true }])(
    'hides Give but allows a supplied Take action with %o', overrides => {
      const onTake = jest.fn();
      setup({ onGive: jest.fn(), onTake, ...overrides });
      expect(screen.queryByRole('button', { name: 'Give' })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Take' }));
      expect(onTake).toHaveBeenCalledTimes(1);
    },
  );

  it('does not offer Give or Take for an item queued for use', () => {
    setup({ onGive: jest.fn(), onTake: jest.fn(), isUsed: true });
    expect(screen.queryByRole('button', { name: 'Give' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Take' })).not.toBeInTheDocument();
  });

  it.each(['Equip', 'Drop'] as const)('calls %s and closes the details', async action => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: action }));
    expect(action === 'Equip' ? props.onEquipped : props.onDropped).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('heading')).not.toBeInTheDocument());
  });

  it.each([{ isSelf: false }, { isDead: true }, { isEquipped: true }])(
    'does not offer equip with %o', overrides => {
      setup(overrides);
      expect(screen.queryByRole('button', { name: 'Equip' })).not.toBeInTheDocument();
    },
  );

  it('allows a consumable at its exact action cost', () => {
    const props = setup({ item: { id: 'potion-1', type: consumable.id }, actionPointsLeft: consumable.useCost });
    fireEvent.click(screen.getByRole('button', { name: 'Use' }));
    expect(props.onUsed).toHaveBeenCalledTimes(1);
    expect(props.onEquipped).not.toHaveBeenCalled();
  });

  it.each([{ isUsed: true }, { actionPointsLeft: consumable.useCost - 1 }, { isSelf: false }])(
    'prevents consumable use with %o', overrides => {
      setup({ item: { id: 'potion-1', type: consumable.id }, ...overrides });
      expect(screen.queryByRole('button', { name: 'Use' })).not.toBeInTheDocument();
    },
  );

  it('learns a scroll with sufficient magic and actions', () => {
    const props = setup({ item: { id: 'scroll-1', type: 'spiritArrowScroll' }, characterType: 'mage', actionPointsLeft: 10 });
    expect(screen.getByText('Mage only')).toHaveClass('itemClassMatch');
    expect(screen.queryByRole('button', { name: 'Drink' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));

    expect(props.onLearnScroll).toHaveBeenCalledTimes(1);
    expect(allItems.spiritArrowScroll.iconXY).toEqual({ x: 7, y: 8 });
    expect(allItems.iceShardsScroll.iconXY).toEqual({ x: 8, y: 8 });
  });

  it('learns a barbarian Brew and ranger Elixir using the attack stat and verifies potion icons', () => {
    expect(allItems.rageScroll.name).toBe('Brew of Rage');
    expect(allItems.rageScroll.iconXY).toEqual({ x: 4, y: 7 });
    expect(allItems.focusScroll.name).toBe('Elixir of Focus');
    expect(allItems.focusScroll.iconXY).toEqual({ x: 2, y: 7 });
    expect(allItems.swiftPotion.iconXY).toEqual({ x: 3, y: 7 });
    expect(allItems.elixir.iconXY).toEqual({ x: 3, y: 7 });

    const props = setup({
      item: { id: 'brew-1', type: 'rageScroll' },
      characterType: 'barbarian',
      baseStats: makeBaseStats({ attack: 10, magic: 0 }),
      actionPointsLeft: 10,
    });
    expect(screen.getByText('Barbarian only')).toHaveClass('itemClassMatch');
    expect(screen.queryByRole('button', { name: 'Learn' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Drink' }));
    expect(props.onLearnScroll).toHaveBeenCalledTimes(1);

    const rangerProps = setup({
      item: { id: 'elixir-1', type: 'focusScroll' },
      characterType: 'ranger',
      baseStats: makeBaseStats({ attack: 10, magic: 0 }),
      actionPointsLeft: 10,
    });
    expect(screen.getByText('Ranger only')).toHaveClass('itemClassMatch');
    expect(screen.queryByRole('button', { name: 'Learn' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Drink' }));
    expect(rangerProps.onLearnScroll).toHaveBeenCalledTimes(1);
  });

  it('does not offer Learn or Drink for a barbarian Brew when attack is too low or class mismatches', () => {
    setup({
      item: { id: 'brew-1', type: 'rageScroll' },
      characterType: 'ranger',
      baseStats: makeBaseStats({ attack: 20, magic: 20 }),
      actionPointsLeft: 10,
    });
    expect(screen.getByText('Barbarian only')).toHaveClass('itemClassMismatch');
    expect(screen.queryByRole('button', { name: 'Learn' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Drink' })).not.toBeInTheDocument();
  });

  it.each([
    { playerSpells: [SpellIds.spiritArrow] }, { actionPointsLeft: 9 }, { baseStats: makeBaseStats({ magic: 9 }) },
    { characterType: 'witch' }, { characterType: 'barbarian' }, { characterType: 'ranger' },
  ])('does not offer an ineligible scroll with %o', overrides => {
    setup({ item: { id: 'scroll-1', type: 'spiritArrowScroll' }, characterType: 'mage', ...overrides });
    expect(screen.queryByRole('button', { name: 'Learn' })).not.toBeInTheDocument();
  });

  it.each([9, 10])('checks affordability at %s coins', coins => {
    const onBuy = jest.fn();
    setup({ isSelf: false, onBuy, availableCoins: coins });
    if (coins === 10) {
      fireEvent.click(screen.getByRole('button', { name: 'Buy' }));
      expect(onBuy).toHaveBeenCalledTimes(1);
    } else {
      expect(screen.queryByRole('button', { name: 'Buy' })).not.toBeInTheDocument();
    }
  });

  it('rounds resale value up and sells the item', () => {
    const onSell = jest.fn();
    setup({ item: { id: 'sword-2', type: 'swordSteel' }, isSelf: false, onSell });
    expect(screen.getByText('18')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sell' }));
    expect(onSell).toHaveBeenCalledTimes(1);
  });

  it('prevents dropping or selling a queued consumable', () => {
    setup({ isUsed: true, onSell: jest.fn() });
    expect(screen.queryByRole('button', { name: 'Sell' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Drop' })).not.toBeInTheDocument();
  });

  it('shows standard single-item stats without an equipped comparison column when none is equipped', () => {
    setup({ item: { id: 'inferno-1', type: 'swordInferno' } });
    expect(screen.queryByRole('columnheader', { name: 'Equipped' })).not.toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows.map(row => within(row).getAllByRole('cell').map(cell => cell.textContent))).toEqual([
      ['attack', '+10'],
      ['damage', '+12'],
      ['magic', '+5'],
    ]);
    for (const row of rows) {
      const valueCell = within(row).getAllByRole('cell')[1];
      expect(valueCell).toHaveClass('statValue');
      expect(valueCell).not.toHaveClass('statWorse', 'statEqual');
    }
  });

  it('does not show a comparison column when the item itself is equipped', () => {
    setup({
      item: { id: 'steel-1', type: 'swordSteel' },
      isEquipped: true,
      equippedItem: { id: 'steel-1', type: 'swordSteel' },
    });
    expect(screen.queryByRole('columnheader', { name: 'Equipped' })).not.toBeInTheDocument();
  });

  it('renders an Equipped comparison column with extra rows and relative stat colors', () => {
    setup({
      item: { id: 'inferno-1', type: 'swordInferno' },
      equippedItem: { id: 'steel-1', type: 'swordSteel' },
    });

    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(3);
    expect(within(headers[0]).getByText('250')).toBeInTheDocument();
    expect(headers[1]).toHaveTextContent('Equipped');
    expect(headers[2]).toHaveTextContent('This Item');

    const bodyRows = screen.getAllByRole('row').slice(1);
    expect(bodyRows.map(row => within(row).getAllByRole('cell').map(cell => cell.textContent))).toEqual([
      ['attack', '+2', '+10'],
      ['damage', '+2', '+12'],
      ['magic', '-', '+5'],
    ]);
    for (const row of bodyRows) {
      const [, equippedCell, itemCell] = within(row).getAllByRole('cell');
      expect(equippedCell).toHaveClass('statWorse');
      expect(itemCell).toHaveClass('statBetter');
    }
  });

  it('includes extra rows from the equipped item, standard color for matching stats, and compares negative stats', () => {
    setup({
      item: { id: 'dagger-1', type: 'dagger' },
      equippedItem: { id: 'steel-1', type: 'swordSteel' },
    });

    const daggerRows = screen.getAllByRole('row').slice(1);
    expect(daggerRows.map(row => within(row).getAllByRole('cell').map(cell => cell.textContent))).toEqual([
      ['attack', '+2', '+2'],
      ['damage', '+2', '+1'],
      ['speed', '-', '+1'],
    ]);
    expect(within(daggerRows[0]).getAllByRole('cell')[1]).toHaveClass('statEqual');
    expect(within(daggerRows[0]).getAllByRole('cell')[2]).toHaveClass('statEqual');
    expect(within(daggerRows[1]).getAllByRole('cell')[1]).toHaveClass('statBetter');
    expect(within(daggerRows[1]).getAllByRole('cell')[2]).toHaveClass('statWorse');
    expect(within(daggerRows[2]).getAllByRole('cell')[1]).toHaveClass('statWorse');
    expect(within(daggerRows[2]).getAllByRole('cell')[2]).toHaveClass('statBetter');

    // Negative stat (-1) is smaller than missing stat (0 / '-')
    setup({
      item: { id: 'hammer-1', type: 'warhammer' },
      equippedItem: { id: 'steel-1', type: 'swordSteel' },
    });
    const hammerRows = screen.getAllByRole('row').slice(1);
    const speedRow = hammerRows.find(row => within(row).getAllByRole('cell')[0].textContent === 'speed')!;
    expect(within(speedRow).getAllByRole('cell').map(c => c.textContent)).toEqual(['speed', '-', '-1']);
    expect(within(speedRow).getAllByRole('cell')[1]).toHaveClass('statBetter');
    expect(within(speedRow).getAllByRole('cell')[2]).toHaveClass('statWorse');
  });
});
