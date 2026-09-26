import type { ComponentProps } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    const props = setup({ item: { id: 'scroll-1', type: 'spiritArrowScroll' }, actionPointsLeft: 10 });
    fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
    expect(props.onLearnScroll).toHaveBeenCalledTimes(1);
  });

  it.each([
    { playerSpells: [SpellIds.spiritArrow] }, { actionPointsLeft: 9 }, { baseStats: makeBaseStats({ magic: 9 }) },
  ])('does not offer an ineligible scroll with %o', overrides => {
    setup({ item: { id: 'scroll-1', type: 'spiritArrowScroll' }, ...overrides });
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
});
