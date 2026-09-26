import { render, screen, within } from '@testing-library/react';
import EntityBaseStats from './entity-base-stats';
import { makeBaseStats } from './test-fixtures';

describe('EntityBaseStats', () => {
  it('shows current values, maximums and signed bonuses', () => {
    render(<EntityBaseStats current={{ health: 5, magic: 10 }} baseStats={makeBaseStats({
      bonuses: makeBaseStats({ attack: 2, defence: -1 }),
    })} />);
    expect(screen.getByText('5/20')).toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /Attack/ })).getByText('+2')).toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /Defence/ })).getByText('-1')).toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /Magic/ })).getByText('10')).toBeInTheDocument();
  });

  it('limits the display to requested stats and preserves zero current values', () => {
    render(<EntityBaseStats current={{ magic: 0 }} baseStats={makeBaseStats()} statsList={['magic']} />);
    expect(screen.getAllByRole('row')).toHaveLength(1);
    expect(screen.getByText('0/10')).toBeInTheDocument();
    expect(screen.queryByText('Health')).not.toBeInTheDocument();
  });
});
