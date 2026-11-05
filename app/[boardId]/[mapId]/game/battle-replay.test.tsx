import { act, fireEvent, render, screen } from '@testing-library/react';
import BattleReplay, { formatEventDescription, REPLAY_SPEED_STORAGE_KEY } from './battle-replay';
import { BattleReplay as BattleReplayType, CombatEvent, EntityItemClass } from '@/lib/store/types';

describe('formatEventDescription', () => {
  it('formats attack hits, misses, and defeats', () => {
    const hitEvent: CombatEvent = {
      id: 'e1',
      initiatorId: 'p1',
      initiatorName: 'Hero',
      actionType: 'attack',
      actionName: 'Melee Attack',
      icon: { sheet: 'spell', iconXY: { x: 6, y: 4 } },
      targets: [
        {
          targetId: 'm1',
          targetName: 'Goblin',
          healthDelta: -8,
          resultHealth: 2,
        },
      ],
    };
    const { container: hitView } = render(<>{formatEventDescription(hitEvent)}</>);
    expect(hitView).toHaveTextContent('Hero Melee Attack → Goblin (-8)');

    const defeatEvent: CombatEvent = {
      ...hitEvent,
      targets: [
        {
          targetId: 'm1',
          targetName: 'Goblin',
          healthDelta: -10,
          resultHealth: 0,
          defeated: true,
        },
      ],
    };
    const { container: defeatView } = render(<>{formatEventDescription(defeatEvent)}</>);
    expect(defeatView).toHaveTextContent('Hero Melee Attack → Goblin (-10 skull)');
    const skull = defeatView.querySelector('.defeatedSkull');
    expect(skull).toBeInTheDocument();
    expect(skull).toHaveClass('material-symbols-outlined');

    const missEvent: CombatEvent = {
      ...hitEvent,
      targets: [
        {
          targetId: 'm1',
          targetName: 'Goblin',
          healthDelta: 0,
          resultHealth: 10,
          miss: true,
        },
      ],
    };
    const { container: missView } = render(<>{formatEventDescription(missEvent)}</>);
    expect(missView).toHaveTextContent('Hero Melee Attack → Goblin (miss)');
  });

  it('formats spells with multiple targets', () => {
    const spellEvent: CombatEvent = {
      id: 'e2',
      initiatorId: 'p1',
      initiatorName: 'Mage',
      actionType: 'spell',
      actionName: 'Fireball',
      icon: { sheet: 'spell', iconXY: { x: 0, y: 0 } },
      targets: [
        { targetId: 'm1', targetName: 'Orc', healthDelta: -12, resultHealth: 8 },
        { targetId: 'm2', targetName: 'Troll', healthDelta: -14, resultHealth: 20 },
      ],
    };
    const { container } = render(<>{formatEventDescription(spellEvent)}</>);
    expect(container).toHaveTextContent('Mage cast Fireball → Orc (-12), Troll (-14)');
  });

  it('formats consumable self-use', () => {
    const itemEvent: CombatEvent = {
      id: 'e3',
      initiatorId: 'p1',
      initiatorName: 'Hero',
      actionType: 'item',
      actionName: 'Health Potion',
      icon: { sheet: 'item', iconXY: { x: 1, y: 1 } },
      targets: [
        { targetId: 'p1', targetName: 'Hero', healthDelta: 15, resultHealth: 25 },
      ],
    };
    const { container } = render(<>{formatEventDescription(itemEvent)}</>);
    expect(container).toHaveTextContent('Hero used Health Potion (+15)');
  });

  it('formats non-damaging spells without health numbers', () => {
    const fearEvent: CombatEvent = {
      id: 'e4',
      initiatorId: 'p1',
      initiatorName: 'Mage',
      actionType: 'spell',
      actionName: 'Fear',
      icon: { sheet: 'spell', iconXY: { x: 2, y: 3 } },
      targets: [{ targetId: 'm1', targetName: 'Goblin', healthDelta: 0, resultHealth: 15 }],
    };
    const { container } = render(<>{formatEventDescription(fearEvent)}</>);
    expect(container).toHaveTextContent('Mage cast Fear → Goblin');
  });
});

describe('BattleReplay Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
    localStorage.clear();
  });

  const sampleReplay: BattleReplayType = {
    locationId: 42,
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
        health: 15,
        maxHealth: 15,
      },
    ],
    events: [
      {
        id: 'ev-1',
        initiatorId: 'p1',
        initiatorName: 'Hero',
        actionType: 'attack',
        actionName: 'Sword Slash',
        icon: { sheet: 'spell', iconXY: { x: 6, y: 4 } },
        targets: [
          { targetId: 'm1', targetName: 'Goblin', healthDelta: -6, resultHealth: 9 },
        ],
      },
      {
        id: 'ev-2',
        initiatorId: 'm1',
        initiatorName: 'Goblin',
        actionType: 'attack',
        actionName: 'Bite',
        icon: { sheet: 'spell', iconXY: { x: 6, y: 4 } },
        targets: [
          { targetId: 'p1', targetName: 'Hero', healthDelta: -4, resultHealth: 16 },
        ],
      },
    ],
  };

  it('renders notice when replay has no events', () => {
    render(<BattleReplay replay={{ locationId: 1, initialEntities: [], events: [] }} />);
    expect(screen.getByText('No combat actions recorded.')).toBeInTheDocument();
  });

  it('renders replay header, allies, and enemies sections', () => {
    const { container } = render(<BattleReplay replay={sampleReplay} />);
    expect(container.querySelector('.eventDescription')).toHaveTextContent('Hero Sword Slash → Goblin (-6)');
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('navigates with Next, Prev, and Restart controls', () => {
    const { container } = render(<BattleReplay replay={sampleReplay} />);

    // Pause auto-play first to test manual buttons
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));

    // Click Next
    fireEvent.click(screen.getByRole('button', { name: 'Next action' }));
    expect(container.querySelector('.eventDescription')).toHaveTextContent('Goblin Bite → Hero (-4)');
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    // Click Prev
    fireEvent.click(screen.getByRole('button', { name: 'Previous action' }));
    expect(container.querySelector('.eventDescription')).toHaveTextContent('Hero Sword Slash → Goblin (-6)');
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    // Click Restart
    fireEvent.click(screen.getByRole('button', { name: 'Next action' }));
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Restart replay' }));
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('automatically advances steps and pauses at the end', async () => {
    render(<BattleReplay replay={sampleReplay} />);
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    // At the end, auto-play finishes and pause button turns to play button
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  it('toggles speed between 1x, 2x, and 3x and persists to localStorage', () => {
    render(<BattleReplay replay={sampleReplay} />);
    const speedButton = screen.getByRole('button', { name: 'Playback speed 1x' });
    expect(speedButton).toBeInTheDocument();

    fireEvent.click(speedButton);
    expect(screen.getByRole('button', { name: 'Playback speed 2x' })).toBeInTheDocument();
    expect(localStorage.getItem(REPLAY_SPEED_STORAGE_KEY)).toBe('2');

    fireEvent.click(screen.getByRole('button', { name: 'Playback speed 2x' }));
    expect(screen.getByRole('button', { name: 'Playback speed 3x' })).toBeInTheDocument();
    expect(localStorage.getItem(REPLAY_SPEED_STORAGE_KEY)).toBe('3');

    fireEvent.click(screen.getByRole('button', { name: 'Playback speed 3x' }));
    expect(screen.getByRole('button', { name: 'Playback speed 1x' })).toBeInTheDocument();
    expect(localStorage.getItem(REPLAY_SPEED_STORAGE_KEY)).toBe('1');
  });

  it('restores saved playback speed from localStorage on load', () => {
    localStorage.setItem(REPLAY_SPEED_STORAGE_KEY, '2');
    render(<BattleReplay replay={sampleReplay} />);
    expect(screen.getByRole('button', { name: 'Playback speed 2x' })).toBeInTheDocument();
  });

  it('does not display a health delta number for actions with 0 healthDelta', () => {
    const fearReplay: BattleReplayType = {
      locationId: 1,
      initialEntities: [
        { id: 'p1', name: 'Hero', iconXY: { x: 0, y: 0 }, className: EntityItemClass.self, health: 20, maxHealth: 20 },
        { id: 'm1', name: 'Goblin', iconXY: { x: 1, y: 1 }, className: EntityItemClass.enemy, health: 15, maxHealth: 15 },
      ],
      events: [
        {
          id: 'ev-fear',
          initiatorId: 'p1',
          initiatorName: 'Hero',
          actionType: 'spell',
          actionName: 'Fear',
          icon: { sheet: 'spell', iconXY: { x: 2, y: 3 } },
          targets: [{ targetId: 'm1', targetName: 'Goblin', healthDelta: 0, resultHealth: 15 }],
        },
      ],
    };
    const { container } = render(<BattleReplay replay={fearReplay} />);
    expect(container.querySelector('.eventDescription')).toHaveTextContent('Hero cast Fear → Goblin');
    expect(container.querySelector('.actionIconSpell')).toBeInTheDocument();
    expect(container.querySelector('.deltaText')).toBeNull();
  });

  it('handles multi-target spells simultaneously', () => {
    const aoeReplay: BattleReplayType = {
      locationId: 1,
      initialEntities: [
        { id: 'p1', name: 'Hero', iconXY: { x: 0, y: 0 }, className: EntityItemClass.self, health: 20, maxHealth: 20 },
        { id: 'm1', name: 'Goblin 1', iconXY: { x: 1, y: 1 }, className: EntityItemClass.enemy, health: 15, maxHealth: 15 },
        { id: 'm2', name: 'Goblin 2', iconXY: { x: 1, y: 1 }, className: EntityItemClass.enemy, health: 12, maxHealth: 12 },
      ],
      events: [
        {
          id: 'ev-aoe',
          initiatorId: 'p1',
          initiatorName: 'Hero',
          actionType: 'spell',
          actionName: 'Chain Lightning',
          icon: { sheet: 'spell', iconXY: { x: 0, y: 0 } },
          targets: [
            { targetId: 'm1', targetName: 'Goblin 1', healthDelta: -5, resultHealth: 10 },
            { targetId: 'm2', targetName: 'Goblin 2', healthDelta: -6, resultHealth: 6 },
          ],
        },
      ],
    };
    const { container } = render(<BattleReplay replay={aoeReplay} />);
    expect(container.querySelector('.eventDescription')).toHaveTextContent('Hero cast Chain Lightning → Goblin 1 (-5), Goblin 2 (-6)');
    expect(screen.getAllByText('-5')).toHaveLength(2);
    expect(screen.getAllByText('-6')).toHaveLength(2);
  });
});
