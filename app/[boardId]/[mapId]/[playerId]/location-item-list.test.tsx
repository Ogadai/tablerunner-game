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
