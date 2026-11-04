import { fireEvent, render, screen } from '@testing-library/react';
import LocationItemList from './location-item-list';

it('picks up the selected item instance even when two items share a type', () => {
  const onTakeItem = jest.fn();
  render(<LocationItemList items={[
    { id: 'sword-1', type: 'swordRusty' }, { id: 'sword-2', type: 'swordRusty' },
  ]} onTakeItem={onTakeItem} />);
  fireEvent.click(screen.getAllByRole('button', { name: 'Rusty Sword' })[1]);
  expect(onTakeItem).toHaveBeenCalledWith('sword-2');
});

it('renders a visual lock icon and locked title for locked chests', () => {
  render(<LocationItemList items={[
    { id: 'chest-1', type: 'chest', key: 'goldKey' },
    { id: 'chest-2', type: 'chest' },
  ]} onTakeItem={jest.fn()} />);

  const buttons = screen.getAllByRole('button', { name: 'Chest' });
  expect(buttons[0]).toHaveAttribute('title', 'Chest (Locked)');
  expect(buttons[1]).toHaveAttribute('title', 'Chest');

  expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
  expect(screen.getAllByTestId('lock-icon')).toHaveLength(1);
});
