import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AttackPickTarget from './attack-pick-target';
import { makeEntity } from './test-fixtures';

describe('AttackPickTarget', () => {
  it('offers no attack without targets', () => {
    render(<AttackPickTarget entities={[]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('attacks a single target directly', () => {
    const target = makeEntity();
    const onAttackTarget = jest.fn();
    render(<AttackPickTarget entities={[target]} onAttackTarget={onAttackTarget} />);
    fireEvent.click(screen.getByRole('button', { name: 'Attack' }));
    expect(onAttackTarget).toHaveBeenCalledWith(target);
  });

  it('lets the player choose among targets and closes the picker', async () => {
    const targets = [makeEntity(), makeEntity({ id: 'enemy-2' })];
    const onAttackTarget = jest.fn();
    render(<AttackPickTarget entities={targets} onAttackTarget={onAttackTarget} />);
    fireEvent.click(screen.getByRole('button', { name: 'Attack' }));
    expect(onAttackTarget).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('listitem')[1]);
    expect(onAttackTarget).toHaveBeenCalledWith(targets[1]);
    await waitFor(() => expect(screen.queryByRole('list')).not.toBeInTheDocument());
  });
});
