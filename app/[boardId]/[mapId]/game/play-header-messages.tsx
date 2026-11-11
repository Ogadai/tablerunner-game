'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Popover } from 'radix-ui';
import Markdown from 'react-markdown';

import styles from './play-header-messages.module.css';
import { PlayerMessagesState } from '@/lib/store/types';
import { isCombatMessage, isActualBattle } from '@/lib/runner/combat-log';
import BattleReplay from './battle-replay';
import { hasPlayerMessageContent } from './popup-gate-service';

export interface PlayHeaderMessagesState {
  isOpen: boolean;
  handledMessages?: PlayerMessagesState;
}

export default function PlayHeaderMessages({
  playerMessages,
  allowAutoOpen = true,
  suppressOpen = false,
  onStateChange,
}: {
  playerMessages?: PlayerMessagesState;
  allowAutoOpen?: boolean;
  suppressOpen?: boolean;
  onStateChange?: (state: PlayHeaderMessagesState) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [autoOpenedFor, setAutoOpenedFor] = useState<PlayerMessagesState | undefined>(undefined);
  const onStateChangeRef = useRef(onStateChange);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  const hasReplay = Boolean(
    playerMessages?.battleReplay && isActualBattle(playerMessages.battleReplay)
  );
  const rawMessages = playerMessages?.messages || [];

  const displayMessages = useMemo(() => {
    if (!hasReplay) return rawMessages;
    return rawMessages.filter(message => !isCombatMessage(message.text));
  }, [rawMessages, hasReplay]);

  const hasContent = hasPlayerMessageContent(playerMessages);

  if (!hasContent && isOpen) {
    setIsOpen(false);
  }

  const effectiveOpen = hasContent && isOpen;

  useEffect(() => {
    if (!hasContent || !allowAutoOpen || autoOpenedFor === playerMessages) {
      return;
    }
    const timer = setTimeout(() => {
      setAutoOpenedFor(playerMessages);
      setIsOpen(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [playerMessages, hasContent, allowAutoOpen, autoOpenedFor]);

  useEffect(() => {
    onStateChangeRef.current?.({ isOpen: effectiveOpen, handledMessages: autoOpenedFor });
  }, [effectiveOpen, autoOpenedFor]);

  useEffect(() => () => {
    onStateChangeRef.current?.({ isOpen: false });
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setAutoOpenedFor(playerMessages);
    }
    setIsOpen(nextOpen);
  };

  return (
    <>
      {hasContent && (
        <Popover.Root modal={true} open={effectiveOpen && !suppressOpen} onOpenChange={handleOpenChange}>
          <Popover.Trigger asChild>
            <button className={styles.triggerButton + ' btn material-symbols-outlined'}>
              mail
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content className={`PopoverContent ${styles.popoverContent} ${hasReplay ? styles.hasReplay : ''}`}>
              <div className={styles.scrollArea}>
                {hasReplay && playerMessages?.battleReplay && (
                  <BattleReplay replay={playerMessages.battleReplay} />
                )}
                {displayMessages.length > 0 && (
                  <ul>
                    {displayMessages.map((message, index) => (
                      <li key={index}>
                        <Markdown>{message.text}</Markdown>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Popover.Close className="PopoverClose material-symbols-outlined">
                close
              </Popover.Close>
              <Popover.Arrow className="PopoverArrow" width={15} height={10} />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </>
  );
}
