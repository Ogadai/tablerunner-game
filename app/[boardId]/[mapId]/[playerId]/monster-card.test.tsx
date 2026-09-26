import { fireEvent, render, screen } from '@testing-library/react';
import MonsterCard from './monster-card';

describe('MonsterCard', () => {
  it.each([[true, 10, true], [false, 10, false], [true, 0, false]])(
    'gates attacking by permission %s and health %s', (canAttack, health, visible) => {
      const onAttack = jest.fn();
      render(<MonsterCard monster={{ id: 'goblin-1', type: 'goblin', location: 1, health }}
        canAttack={canAttack} onAttack={onAttack} />);
      if (visible) {
        fireEvent.click(screen.getByRole('button', { name: 'Attack' }));
        expect(onAttack).toHaveBeenCalledTimes(1);
      } else {
        expect(screen.queryByRole('button', { name: 'Attack' })).not.toBeInTheDocument();
      }
    },
  );
});
