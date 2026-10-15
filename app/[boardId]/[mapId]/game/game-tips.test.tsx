import type { ComponentProps, ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import GameTips from './game-tips';

jest.mock('react-markdown', () => ({ __esModule: true, default: ({ children }: { children: ReactNode }) => <p>{children}</p> }));

const tips = [
  { turn: 1, markDownMessage: 'Visit the village.' },
  { turn: 2, markDownMessage: 'Stay on the roads.' },
  { turn: 4, markDownMessage: 'Hire a companion.' },
];
const defaultProps = {
  gameId: 'test-game', turn: 1, tips, reviewOpen: false, allowPopup: true, onReviewClose: jest.fn(),
};
const clearCookies = () => {
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.trim().split('=')[0];
    if (name.startsWith('tablerunner-')) document.cookie = `${name}=; Max-Age=0; Path=/`;
  }
};
const flush = async () => { await act(async () => { await jest.advanceTimersByTimeAsync(0); }); };
const mount = async (props: Partial<ComponentProps<typeof GameTips>> = {}) => {
  const view = render(<GameTips {...defaultProps} {...props} />);
  await flush();
  return view;
};

describe('GameTips', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    clearCookies();
  });
  afterEach(() => {
    clearCookies();
    jest.useRealTimers();
  });

  it('shows only the scheduled tips with tips enabled by default', async () => {
    await mount();
    expect(screen.getByRole('dialog', { name: 'Game Tip' })).toBeInTheDocument();
    expect(screen.getByText('Visit the village.')).toBeInTheDocument();
    expect(screen.queryByText(/^Turn \d+$/)).not.toBeInTheDocument();
    expect(screen.queryByText('Stay on the roads.')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Show tips' })).toBeChecked();
  });

  it.each(['Got it', 'Close tips', 'Escape'])('dismisses via %s and remembers the tip after remounting', async dismissal => {
    const view = await mount();
    if (dismissal === 'Escape') fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    else fireEvent.click(screen.getByRole('button', { name: dismissal }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    view.unmount();
    await mount();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('remembers a displayed tip even when refreshed before dismissal', async () => {
    const view = await mount();
    view.unmount();
    await mount();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a newly reached tip without replaying missed turns', async () => {
    const view = await mount({ turn: 3 });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    view.rerender(<GameTips {...defaultProps} turn={4} />);
    await flush();
    expect(screen.getByText('Hire a companion.')).toBeInTheDocument();
    expect(screen.queryByText('Visit the village.')).not.toBeInTheDocument();
  });

  it('persists disabling tips across refreshes and other games, while allowing review and re-enabling', async () => {
    const view = await mount();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show tips' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.cookie).toContain('tablerunner-show-tips=false');
    view.unmount();
    const refreshed = await mount({ gameId: 'another-game', turn: 2 });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    refreshed.rerender(<GameTips {...defaultProps} gameId="another-game" turn={2} reviewOpen allowPopup={false} />);
    await flush();
    expect(screen.getByText('Visit the village.')).toBeInTheDocument();
    expect(screen.getByText('Stay on the roads.')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Show tips' })).not.toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show tips' }));
    expect(document.cookie).toContain('tablerunner-show-tips=true');
    refreshed.rerender(<GameTips {...defaultProps} gameId="another-game" turn={4} />);
    await flush();
    expect(screen.getByRole('dialog', { name: 'Game Tip' })).toBeInTheDocument();
    expect(screen.getByText('Hire a companion.')).toBeInTheDocument();
  });

  it('keeps seen tips separate for each game', async () => {
    const view = await mount();
    view.unmount();
    await mount({ gameId: 'another-game' });
    expect(screen.getByText('Visit the village.')).toBeInTheDocument();
  });

  it('does not repeat seen tips when their definitions are reordered', async () => {
    const view = await mount();
    view.unmount();
    await mount({ tips: [...tips].reverse() });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows multiple tips scheduled for the same turn together', async () => {
    await mount({ tips: [...tips, { turn: 1, markDownMessage: 'Keep your party together.' }] });
    expect(screen.getByText('Visit the village.')).toBeInTheDocument();
    expect(screen.getByText('Keep your party together.')).toBeInTheDocument();
    expect(screen.queryByText('Stay on the roads.')).not.toBeInTheDocument();
  });

  it('waits until popups are allowed before showing or recording a tip', async () => {
    const view = await mount({ allowPopup: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.cookie).not.toContain('tablerunner-tip-seen-');
    view.rerender(<GameTips {...defaultProps} />);
    await flush();
    expect(screen.getByText('Visit the village.')).toBeInTheDocument();
  });

  it('reviews tips in turn order and keeps future tips hidden', async () => {
    await mount({ turn: 2, tips: [...tips].reverse(), reviewOpen: true, allowPopup: false });
    expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual(['Visit the village.', 'Stay on the roads.']);
    expect(screen.queryByText('Hire a companion.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(defaultProps.onReviewClose).toHaveBeenCalledTimes(1);
  });

  it('explains when there are no tips available for review yet', async () => {
    await mount({ turn: 0, reviewOpen: true, allowPopup: false });
    expect(screen.getByText('No tips are available yet.')).toBeInTheDocument();
  });
});
