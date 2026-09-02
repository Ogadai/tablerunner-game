'use client'
import { useState, useEffect } from 'react';
import { Popover } from 'radix-ui';
import Markdown from 'react-markdown'

import styles from "./play-header-messages.module.css";

import { getPlayerMessages } from "@/lib/store/playerMessages";
import { GameState, PlayerMessagesState } from '@/lib/store/types';

export default function PlayHeaderMessages(  { boardId, mapId, playerId, gameState }
  : { boardId: string, mapId: string, playerId: string, gameState: GameState }
) {
  const [playerMessages, setPlayerMessages] = useState<PlayerMessagesState | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function fetchPlayerMessages() {
      const messages = await getPlayerMessages(boardId, mapId, playerId);
      setPlayerMessages(messages.data!);

      if (messages.data?.messages && messages.data?.messages.length > 0) {
        setTimeout(() => setIsOpen(true), 500);
      }
    }

    fetchPlayerMessages();
  }, [gameState]);

  const hasMessages = playerMessages?.messages && playerMessages.messages.length > 0;

  return (<>
    { hasMessages && <Popover.Root modal={true} open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button className="btn material-symbols-outlined">mail</button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={ `PopoverContent ${styles.popoverContent}` }>
          <ul>
            { playerMessages?.messages.map(message => (
              <li key={message.text}><Markdown>{message.text}</Markdown></li>
            ))}
          </ul>
          <Popover.Close className="PopoverClose material-symbols-outlined">close</Popover.Close>
          <Popover.Arrow className="PopoverArrow" width={15} height={10} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root> }
  </>);
}


