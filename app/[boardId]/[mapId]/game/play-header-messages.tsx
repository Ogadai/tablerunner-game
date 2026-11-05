'use client';

import { useState, useEffect, useMemo } from 'react';
import { Popover } from 'radix-ui';
import Markdown from 'react-markdown';

import styles from './play-header-messages.module.css';
import { PlayerMessagesState } from '@/lib/store/types';
import { isCombatMessage } from '@/lib/runner/combat-log';
import BattleReplay from './battle-replay';

export default function PlayHeaderMessages({
  playerMessages,
}: {
  playerMessages?: PlayerMessagesState;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const hasReplay = Boolean(
    playerMessages?.battleReplay && playerMessages.battleReplay.events.length > 0
  );
  const rawMessages = playerMessages?.messages || [];

  const displayMessages = useMemo(() => {
    if (!hasReplay) return rawMessages;
    return rawMessages.filter(message => !isCombatMessage(message.text));
  }, [rawMessages, hasReplay]);

  const hasContent = hasReplay || rawMessages.length > 0;

  useEffect(() => {
    if (hasContent) {
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [playerMessages, hasContent]);

  return (
    <>
      {hasContent && (
        <Popover.Root modal={true} open={isOpen} onOpenChange={setIsOpen}>
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
