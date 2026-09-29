import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { PlayerMessagesState } from '@/lib/store/types';
import PlayHeaderMessages from './play-header-messages';
// Markdown is ESM-only; keep these tests focused on displaying messages.
jest.mock('react-markdown', () => ({ __esModule: true, default: ({ children }: { children: ReactNode }) => <p>{children}</p> }));

describe('PlayHeaderMessages', () => {
  const originalResizeObserver = global.ResizeObserver;
  beforeAll(() => {
    // Radix observes popup dimensions; jsdom does not implement layout observers.
    global.ResizeObserver = jest.fn().mockImplementation(() => ({ observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn() }));
  });
  afterAll(() => { global.ResizeObserver = originalResizeObserver; });
  let messages: PlayerMessagesState | undefined;
  const mount = async () => {
    let view!: ReturnType<typeof render>;
    await act(async () => { view = render(<PlayHeaderMessages playerMessages={messages} />); });
    return view;
  };
  beforeEach(() => {
    jest.useFakeTimers();
    messages = { messages: [{ text: 'A dragon approaches' }, { text: 'You gained a level' }] };
  });
  afterEach(() => jest.useRealTimers());

  it.each([{ messages: [] }, undefined])('hides the trigger when there are no messages: %j', async result => {
    messages = result;
    await mount();
    expect(screen.queryByRole('button', { name: 'mail' })).not.toBeInTheDocument();
  });

  it('opens messages after 500ms and supports closing and reopening', async () => {
    await mount();
    expect(screen.getByRole('button', { name: 'mail' })).toBeInTheDocument();
    await act(async () => { await jest.advanceTimersByTimeAsync(499); });
    expect(screen.queryByText('A dragon approaches')).not.toBeInTheDocument();
    await act(async () => { await jest.advanceTimersByTimeAsync(1); });
    expect(screen.getByText('A dragon approaches')).toBeInTheDocument();
    expect(screen.getByText('You gained a level')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByText('A dragon approaches')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'mail' }));
    expect(screen.getByText('A dragon approaches')).toBeInTheDocument();
  });

  it('refreshes messages from the next snapshot', async () => {
    const view = await mount();
    await act(async () => view.rerender(<PlayHeaderMessages playerMessages={{ messages: [{ text: 'Next turn' }] }} />));
    await act(async () => { await jest.advanceTimersByTimeAsync(500); });
    expect(screen.getByText('Next turn')).toBeInTheDocument();
    expect(screen.queryByText('A dragon approaches')).not.toBeInTheDocument();
    await act(async () => view.rerender(<PlayHeaderMessages playerMessages={{ messages: [] }} />));
    expect(screen.queryByRole('button', { name: 'mail' })).not.toBeInTheDocument();
    expect(screen.queryByText('Next turn')).not.toBeInTheDocument();
  });
});
