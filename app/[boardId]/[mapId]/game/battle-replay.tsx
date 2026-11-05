'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import EntityList, { EntityTargetOverlay } from '@/app/[boardId]/[mapId]/[playerId]/entity-list';
import { isSkillSpell, spells } from '@/lib/games/spells';
import { BattleReplay as BattleReplayType, CombatEvent, EntityItemClass, EntityItemDetail } from '@/lib/store/types';
import styles from './battle-replay.module.css';

export const REPLAY_SPEED_STORAGE_KEY = 'battle_replay_speed';
export const REPLAY_SPEEDS = [1, 2, 3];

interface TrajectoryLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function formatEventDescription(event: CombatEvent): React.ReactNode {
  const isSkill =
    event.actionType === 'spell' &&
    isSkillSpell(Object.values(spells).find(s => s.name.toLowerCase() === event.actionName.toLowerCase()));

  const verb =
    event.actionType === 'spell'
      ? isSkill
        ? 'activated'
        : 'cast'
      : event.actionType === 'item'
      ? 'used'
      : event.actionType === 'effect'
      ? 'triggered'
      : '';

  if (
    event.actionType === 'item' &&
    event.targets.length === 1 &&
    event.targets[0].targetId === event.initiatorId
  ) {
    const delta = event.targets[0].healthDelta;
    return (
      <>
        {event.initiatorName} used {event.actionName}
        {delta !== 0 && ` (${delta > 0 ? `+${delta}` : delta})`}
      </>
    );
  }

  return (
    <>
      {event.initiatorName} {verb} {event.actionName}
      {event.targets.length > 0 && (
        <>
          {' → '}
          {event.targets.map((t, idx) => {
            let outcome: string | null = null;
            let outcomeClass: string = '';
            if (t.miss) {
              outcome = 'miss';
              outcomeClass = styles.outcomeMiss;
            } else if (t.healthDelta < 0) {
              outcome = `${t.healthDelta}`;
              outcomeClass = styles.outcomeDamage;
            } else if (t.healthDelta > 0) {
              outcome = `+${t.healthDelta}`;
              outcomeClass = styles.outcomeHeal;
            }

            return (
              <span key={t.targetId || idx}>
                {idx > 0 && ', '}
                {t.targetName}
                {(outcome !== null || t.defeated) && (
                  <>
                    {' ('}
                    <span className={outcomeClass}>{outcome}</span>
                    {outcome !== null && t.defeated && ' '}
                    {t.defeated && (
                      <span
                        className={`${styles.defeatedSkull} material-symbols-outlined`}
                        aria-label="defeated"
                        title="Defeated"
                      >
                        skull
                      </span>
                    )}
                    {')'}
                  </>
                )}
              </span>
            );
          })}
        </>
      )}
    </>
  );
}

export default function BattleReplay({ replay }: { replay: BattleReplayType }) {
  const { initialEntities = [], events = [] } = replay;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(events.length > 0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(REPLAY_SPEED_STORAGE_KEY);
        if (saved) {
          const parsed = parseFloat(saved);
          if (REPLAY_SPEEDS.includes(parsed)) {
            return parsed;
          }
        }
      } catch {
        // ignore storage errors
      }
    }
    return 1;
  });
  const [lines, setLines] = useState<TrajectoryLine[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REPLAY_SPEED_STORAGE_KEY);
      if (saved) {
        const parsed = parseFloat(saved);
        if (REPLAY_SPEEDS.includes(parsed)) {
          setPlaybackSpeed(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Auto-advance playback
  useEffect(() => {
    if (!isPlaying || events.length === 0) return;
    const intervalMs = Math.round(1000 / playbackSpeed);
    const timer = setTimeout(() => {
      if (currentIndex < events.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsPlaying(false);
      }
    }, intervalMs);
    return () => clearTimeout(timer);
  }, [isPlaying, currentIndex, playbackSpeed, events.length]);

  const currentEvent: CombatEvent | undefined = events[currentIndex];

  // Calculate entity health at current step
  const currentEntities = useMemo(() => {
    if (currentIndex < 0 || events.length === 0) {
      return initialEntities;
    }
    const healthMap = new Map<string, number>();
    for (const e of initialEntities) {
      healthMap.set(e.id, e.health);
    }
    for (let i = 0; i <= currentIndex && i < events.length; i++) {
      const ev = events[i];
      for (const t of ev.targets) {
        healthMap.set(t.targetId, t.resultHealth);
      }
    }
    return initialEntities.map(e => ({
      ...e,
      health: healthMap.get(e.id) ?? e.health,
    }));
  }, [initialEntities, events, currentIndex]);

  const isFriendly = (className: EntityItemClass) =>
    className === EntityItemClass.self ||
    className === EntityItemClass.friendly ||
    className === EntityItemClass.npc;

  const friendlyEntities = useMemo(
    () => currentEntities.filter(e => isFriendly(e.className)),
    [currentEntities]
  );

  const enemyEntities = useMemo(
    () => currentEntities.filter(e => !isFriendly(e.className)),
    [currentEntities]
  );

  const targetOverlays: Record<string, EntityTargetOverlay> = useMemo(() => {
    if (!currentEvent) return {};
    const overlays: Record<string, EntityTargetOverlay> = {};
    for (const t of currentEvent.targets) {
      let text: string | undefined = undefined;
      if (t.miss) {
        text = 'MISS';
      } else if (t.healthDelta < 0) {
        text = `${t.healthDelta}`;
      } else if (t.healthDelta > 0) {
        text = `+${t.healthDelta}`;
      }
      overlays[t.targetId] = {
        icon: currentEvent.icon,
        text,
        isDamage: t.healthDelta < 0,
        miss: !!t.miss,
      };
    }
    return overlays;
  }, [currentEvent]);

  // Recalculate trajectory lines between initiator and targets
  useEffect(() => {
    if (!containerRef.current || !currentEvent) {
      setLines([]);
      return;
    }

    const updateLines = () => {
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const initEl = container.querySelector(`[data-entity-id="${currentEvent.initiatorId}"]`);
      if (!initEl) {
        setLines([]);
        return;
      }
      const initRect = initEl.getBoundingClientRect();
      const rawX1 = initRect.left + initRect.width / 2 - containerRect.left;
      const rawY1 = initRect.top + initRect.height / 2 - containerRect.top;

      const newLines: TrajectoryLine[] = [];
      for (const t of currentEvent.targets) {
        if (t.targetId === currentEvent.initiatorId) continue;
        const targetEl = container.querySelector(`[data-entity-id="${t.targetId}"]`);
        if (targetEl) {
          const targetRect = targetEl.getBoundingClientRect();
          const rawX2 = targetRect.left + targetRect.width / 2 - containerRect.left;
          const rawY2 = targetRect.top + targetRect.height / 2 - containerRect.top;

          const dx = rawX2 - rawX1;
          const dy = rawY2 - rawY1;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Shorten line so arrowhead stops before the card's center action icon
          if (dist > 35) {
            const startOffset = 20;
            const endOffset = 28;
            newLines.push({
              id: `${currentEvent.initiatorId}->${t.targetId}`,
              x1: rawX1 + (dx / dist) * startOffset,
              y1: rawY1 + (dy / dist) * startOffset,
              x2: rawX2 - (dx / dist) * endOffset,
              y2: rawY2 - (dy / dist) * endOffset,
            });
          } else {
            newLines.push({
              id: `${currentEvent.initiatorId}->${t.targetId}`,
              x1: rawX1,
              y1: rawY1,
              x2: rawX2,
              y2: rawY2,
            });
          }
        }
      }
      setLines(newLines);
    };

    updateLines();
    window.addEventListener('resize', updateLines);
    return () => window.removeEventListener('resize', updateLines);
  }, [currentIndex, currentEvent]);

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    setIsPlaying(false);
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentIndex(prev => Math.min(events.length - 1, prev + 1));
  };

  const handlePlayPause = () => {
    if (!isPlaying && currentIndex >= events.length - 1) {
      setCurrentIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(prev => !prev);
    }
  };

  const handleToggleSpeed = () => {
    setPlaybackSpeed(prev => {
      const nextIdx = (REPLAY_SPEEDS.indexOf(prev) + 1) % REPLAY_SPEEDS.length;
      const nextSpeed = REPLAY_SPEEDS[nextIdx];
      try {
        localStorage.setItem(REPLAY_SPEED_STORAGE_KEY, String(nextSpeed));
      } catch {
        // ignore storage errors
      }
      return nextSpeed;
    });
  };

  if (events.length === 0) {
    return (
      <div className={styles.battleReplay}>
        <div className={styles.emptyNotice}>No combat actions recorded.</div>
      </div>
    );
  }

  const activeEntityId = currentEvent?.initiatorId;

  return (
    <div className={styles.battleReplay}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.controlButton}
            onClick={handleRestart}
            title="Restart replay"
            aria-label="Restart replay"
          >
            <span className="material-symbols-outlined">replay</span>
          </button>
        </div>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.controlButton}
            onClick={handlePrev}
            disabled={currentIndex <= 0}
            title="Previous action"
            aria-label="Previous action"
          >
            <span className="material-symbols-outlined">skip_previous</span>
          </button>
          <button
            type="button"
            className={`${styles.controlButton} ${styles.playPauseButton}`}
            onClick={handlePlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            <span className="material-symbols-outlined">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <button
            type="button"
            className={styles.controlButton}
            onClick={handleNext}
            disabled={currentIndex >= events.length - 1}
            title="Next action"
            aria-label="Next action"
          >
            <span className="material-symbols-outlined">skip_next</span>
          </button>
        </div>
        <div className={styles.headerRight}>
          <button
            type="button"
            className={`${styles.controlButton} ${styles.speedButton}`}
            onClick={handleToggleSpeed}
            title="Toggle speed"
            aria-label={`Playback speed ${playbackSpeed}x`}
          >
            <span className="material-symbols-outlined">
              {playbackSpeed === 1 ? 'single_arrow' : playbackSpeed === 2 ? 'double_arrow' : 'single_arrowdouble_arrow'}
            </span>
          </button>
        </div>
      </div>

      <div className={styles.stepCounter}>
        {currentIndex + 1} / {events.length}
      </div>
      <div className={styles.eventDescription}>
        {currentEvent ? formatEventDescription(currentEvent) : ''}
      </div>

      <div className={styles.replayContainer} ref={containerRef}>
        <svg className={styles.trajectorySvg} aria-hidden="true">
          <defs>
            <marker
              id="replay-arrow"
              viewBox="0 0 16 16"
              refX="13"
              refY="8"
              markerWidth="14"
              markerHeight="14"
              orient="auto"
            >
              <path
                d="M 2 3 L 14 8 L 2 13 L 5 8 Z"
                fill="var(--gold-bright, #ffd700)"
                stroke="var(--color-text-primary, #2b221a)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </marker>
          </defs>
          {lines.map(line => (
            <line
              key={line.id}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              className={styles.trajectoryLine}
              markerEnd="url(#replay-arrow)"
            />
          ))}
        </svg>

        {friendlyEntities.length > 0 && (
          <div className={styles.teamSection}>
            <div className={styles.teamListWrapper}>
              <EntityList
                entities={friendlyEntities}
                activeEntityId={activeEntityId}
                targetOverlays={targetOverlays}
                clickDisabled={true}
              />
            </div>
          </div>
        )}

        {enemyEntities.length > 0 && (
          <div className={styles.teamSection}>
            <div className={styles.teamListWrapper}>
              <EntityList
                entities={enemyEntities}
                activeEntityId={activeEntityId}
                targetOverlays={targetOverlays}
                clickDisabled={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
