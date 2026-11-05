import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { EntityItemClass, type PlayerMessagesState } from '@/lib/store/types';
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

  it('re-opens automatically when new turn messages or replay arrive after being closed by user', async () => {
    const view = await mount();
    // Turn 1: Opens after 500ms
    await act(async () => { await jest.advanceTimersByTimeAsync(500); });
    expect(screen.getByText('A dragon approaches')).toBeInTheDocument();

    // User closes the popover
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByText('A dragon approaches')).not.toBeInTheDocument();

    // Turn 2 arrives with battle replay or new messages (hasContent is still true!)
    await act(async () => {
      view.rerender(
        <PlayHeaderMessages
          playerMessages={{
            messages: [{ text: 'You were defeated in battle!' }],
            battleReplay: {
              locationId: 1,
              initialEntities: [],
              events: [
                {
                  id: 'e1',
                  initiatorId: 'm1',
                  initiatorName: 'Dragon',
                  actionType: 'attack',
                  actionName: 'Breathe Fire',
                  icon: { sheet: 'spell', iconXY: { x: 0, y: 0 } },
                  targets: [
                    {
                      targetId: 'p1',
                      targetName: 'Hero',
                      healthDelta: -20,
                      resultHealth: 0,
                      defeated: true,
                    },
                  ],
                },
              ],
            },
          }}
        />
      );
    });

    // Popover re-opens automatically after 500ms!
    await act(async () => { await jest.advanceTimersByTimeAsync(500); });
    expect(screen.getByRole('button', { name: 'Restart replay' })).toBeInTheDocument();
  });

  it('displays battle replay and filters combat messages when replay is present', async () => {
    messages = {
      messages: [
        { text: 'Hero hit Goblin for 8 damage' },
        { text: 'A mysterious chest was unlocked!' },
      ],
      battleReplay: {
        locationId: 10,
        initialEntities: [
          {
            id: 'p1',
            name: 'Hero',
            iconXY: { x: 0, y: 0 },
            className: EntityItemClass.self,
            health: 20,
            maxHealth: 20,
          },
          {
            id: 'm1',
            name: 'Goblin',
            iconXY: { x: 1, y: 1 },
            className: EntityItemClass.enemy,
            health: 10,
            maxHealth: 10,
          },
        ],
        events: [
          {
            id: 'ev-1',
            initiatorId: 'p1',
            initiatorName: 'Hero',
            actionType: 'attack',
            actionName: 'Sword',
            icon: { sheet: 'spell', iconXY: { x: 6, y: 4 } },
            targets: [{ targetId: 'm1', targetName: 'Goblin', healthDelta: -8, resultHealth: 2 }],
          },
        ],
      },
    };
    await mount();
    await act(async () => { await jest.advanceTimersByTimeAsync(500); });

    // Battle replay is visible
    expect(screen.getByRole('button', { name: 'Restart replay' })).toBeInTheDocument();
    expect(document.querySelector('.eventDescription')).toHaveTextContent('Hero Sword → Goblin (-8)');
    // Non-combat message is displayed
    expect(screen.getByText('A mysterious chest was unlocked!')).toBeInTheDocument();
    // Redundant combat message is suppressed
    expect(screen.queryByText('Hero hit Goblin for 8 damage')).not.toBeInTheDocument();
  });
});
