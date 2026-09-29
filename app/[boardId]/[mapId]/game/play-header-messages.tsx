'use client'
import { useState, useEffect } from 'react';
import { Popover } from 'radix-ui';
import Markdown from 'react-markdown'

import styles from "./play-header-messages.module.css";

import { PlayerMessagesState } from '@/lib/store/types';

export default function PlayHeaderMessages({ playerMessages }
  : { playerMessages?: PlayerMessagesState }
) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (playerMessages?.messages.length) {
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [playerMessages]);

  const hasMessages = playerMessages?.messages && playerMessages.messages.length > 0;
  const messagesWithIDs = playerMessages?.messages.map((message, index) => ({ ...message, id: index })) || [];

  return (<>
    { hasMessages && <Popover.Root modal={true} open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button className="btn material-symbols-outlined">mail</button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={ `PopoverContent ${styles.popoverContent}` }>
          <ul>
            { messagesWithIDs.map(message => (
              <li key={message.id}><Markdown>{message.text}</Markdown></li>
            ))}
          </ul>
          <Popover.Close className="PopoverClose material-symbols-outlined">close</Popover.Close>
          <Popover.Arrow className="PopoverArrow" width={15} height={10} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root> }
  </>);
}


