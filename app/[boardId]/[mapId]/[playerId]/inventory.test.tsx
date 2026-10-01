import { fireEvent, render, screen } from '@testing-library/react';
import Inventory from './inventory';
import { makePlayer } from './test-fixtures';

describe('Inventory', () => {
  it.each(['Use', 'Drop', 'Learn'] as const)('forwards %s with the selected inventory item', action => {
    const item = { id: 'selected-item', type: action === 'Learn' ? 'spiritArrowScroll' : 'healingPotion' };
    const onUseItem = jest.fn();
    const onDropItem = jest.fn();
    const onLearnScroll = jest.fn();
    render(<Inventory player={makePlayer({ equipment: [item] })} isSelf isDead={false}
      actionPointsLeft={20} usedItemIds={[]} onEquipItem={jest.fn()}
      onUseItem={onUseItem} onDropItem={onDropItem} onLearnScroll={onLearnScroll} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: action }));
    expect(action === 'Use' ? onUseItem : action === 'Drop' ? onDropItem : onLearnScroll).toHaveBeenCalledWith(item);
  });

  it.each(['Give', 'Take'] as const)('forwards %s with the selected inventory instance', action => {
    const items = [{ id: 'first', type: 'swordRusty' }, { id: 'second', type: 'swordRusty' }];
    const onGiveItem = jest.fn();
    const onTakeItem = jest.fn();
    render(<Inventory player={makePlayer({ equipment: items })} isSelf isDead={false}
      actionPointsLeft={20} usedItemIds={[]} onEquipItem={jest.fn()}
      onUseItem={jest.fn()} onDropItem={jest.fn()} onLearnScroll={jest.fn()}
      onGiveItem={onGiveItem} onTakeItem={onTakeItem} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Rusty Sword' })[1]);
    fireEvent.click(screen.getByRole('button', { name: action }));
    const callback = action === 'Give' ? onGiveItem : onTakeItem;
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(items[1]);
    expect(action === 'Give' ? onTakeItem : onGiveItem).not.toHaveBeenCalled();
  });

  it.each(['Give', 'Take', undefined] as const)('only offers the supplied optional action: %s', action => {
    render(<Inventory player={makePlayer({ equipment: [{ id: 'sword-1', type: 'swordRusty' }] })}
      isSelf isDead={false} actionPointsLeft={20} usedItemIds={[]}
      onEquipItem={jest.fn()} onUseItem={jest.fn()} onDropItem={jest.fn()} onLearnScroll={jest.fn()}
      onGiveItem={action === 'Give' ? jest.fn() : undefined}
      onTakeItem={action === 'Take' ? jest.fn() : undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rusty Sword' }));
    if (action) expect(screen.getByRole('button', { name: action })).toBeInTheDocument();
    if (action !== 'Give') expect(screen.queryByRole('button', { name: 'Give' })).not.toBeInTheDocument();
    if (action !== 'Take') expect(screen.queryByRole('button', { name: 'Take' })).not.toBeInTheDocument();
  });

  it('passes used item IDs through to prevent reusing or transferring a queued potion', () => {
    render(<Inventory player={makePlayer({ equipment: [{ id: 'potion-1', type: 'healingPotion' }] })}
      isSelf isDead={false} actionPointsLeft={20} usedItemIds={['potion-1']}
      onEquipItem={jest.fn()} onUseItem={jest.fn()} onDropItem={jest.fn()} onLearnScroll={jest.fn()}
      onGiveItem={jest.fn()} onTakeItem={jest.fn()} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByRole('button', { name: 'Use' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Drop' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Give' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Take' })).not.toBeInTheDocument();
  });

  it('marks the equipped instance and sends the selected instance to callbacks', () => {
    const items = [{ id: 'first', type: 'swordRusty' }, { id: 'second', type: 'swordRusty' }];
    const onEquipItem = jest.fn();
    render(<Inventory player={makePlayer({ equipment: items, equipped: { weapon: 'first' } })}
      isSelf isDead={false} actionPointsLeft={20} usedItemIds={[]}
      onEquipItem={onEquipItem} onUseItem={jest.fn()} onDropItem={jest.fn()} onLearnScroll={jest.fn()} />);
    const buttons = screen.getAllByRole('button', { name: 'Rusty Sword' });
    expect(buttons[0]).toHaveClass('equippedItem');
    expect(buttons[1]).not.toHaveClass('equippedItem');
    fireEvent.click(buttons[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Equip' }));
    expect(onEquipItem).toHaveBeenCalledWith(items[1]);
  });
});
