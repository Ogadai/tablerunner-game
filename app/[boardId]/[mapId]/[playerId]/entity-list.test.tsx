import { fireEvent, render, screen } from '@testing-library/react';
import EntityList from './entity-list';
import { makeEntity } from './test-fixtures';

describe('EntityList', () => {
  it('renders icons with accessible names and tooltips without visible name labels', () => {
    const entity = makeEntity({ name: 'Follower', iconXY: { x: 3, y: 2 } });
    render(<EntityList entities={[entity]} onClickEntity={jest.fn()} />);
    const entry = screen.getByRole('listitem', { name: 'Follower' });
    expect(entry).toHaveAttribute('title', 'Follower');
    expect(entry).toHaveAttribute('tabindex', '0');
    expect(entry.querySelector('.entityIcon')).toHaveStyle({ backgroundPosition: '-150px -160px' });
    expect(screen.queryByText('Follower')).not.toBeInTheDocument();
  });

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
