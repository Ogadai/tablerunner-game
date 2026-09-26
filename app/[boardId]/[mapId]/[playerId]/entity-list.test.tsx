import { fireEvent, render, screen } from '@testing-library/react';
import EntityList from './entity-list';
import { makeEntity } from './test-fixtures';

describe('EntityList', () => {
  it.each([[1, 'critical'], [2, 'hurt'], [4, 'hurt'], [5, 'healthy']])(
    'shows health %s with the %s severity', (health, severity) => {
      const { container } = render(<EntityList entities={[makeEntity({ health: Number(health) })]} />);
      expect(container.querySelector('.healthBar')).toHaveClass(String(severity));
      expect(container.querySelector('.healthBar')).toHaveStyle({ height: `${Number(health) * 10}%` });
    },
  );

  it('distinguishes dead, healthy and level-up entities and returns the selected entity', () => {
    const entities = [makeEntity({ health: 0 }), makeEntity({ id: 'hero', levelUp: true })];
    const onClickEntity = jest.fn();
    const { container } = render(<EntityList entities={entities} onClickEntity={onClickEntity} />);
    expect(screen.getByText('skull')).toBeInTheDocument();
    expect(container.querySelector('.healthBar')).toBeNull();
    expect(screen.getAllByRole('listitem')[1]).toHaveClass('levelUp');
    fireEvent.click(screen.getAllByRole('listitem')[1]);
    expect(onClickEntity).toHaveBeenCalledWith(entities[1]);
  });
});
