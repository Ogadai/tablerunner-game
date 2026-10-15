'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import Markdown from 'react-markdown';
import type { GameTip } from '@/lib/games/types';
import styles from './game-tips.module.css';

const showTipsCookie = 'tablerunner-show-tips';
const cookieMaxAge = 60 * 60 * 24 * 365;

function readCookie(name: string): string | undefined {
  try {
    return document.cookie.split(';').map(cookie => cookie.trim())
      .find(cookie => cookie.startsWith(`${name}=`))?.slice(name.length + 1);
  } catch {
    return undefined;
  }
}

function writeCookie(name: string, value: string) {
  try {
    document.cookie = `${name}=${value}; Path=/; Max-Age=${cookieMaxAge}; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
  } catch {
    // Tips still work for this session when the browser blocks cookies.
  }
}

function seenTipCookie(gameId: string, tip: GameTip): string {
  // Content-based keys keep seen tips stable when the list is reordered.
  let hash = 0x811c9dc5;
  for (let index = 0; index < tip.markDownMessage.length; index++) {
    hash = Math.imul(hash ^ tip.markDownMessage.charCodeAt(index), 0x01000193);
  }
  return `tablerunner-tip-seen-${encodeURIComponent(gameId)}-${tip.turn}-${(hash >>> 0).toString(36)}`;
}

export default function GameTips({ gameId, turn, tips, reviewOpen, allowPopup, onReviewClose }: {
  gameId: string;
  turn: number;
  tips: GameTip[];
  reviewOpen: boolean;
  allowPopup: boolean;
  onReviewClose: () => void;
}) {
  const [showTips, setShowTips] = useState(true);
  const [popupTips, setPopupTips] = useState<GameTip[]>([]);
  const seenTips = useRef(new Set<string>());
  const showTipsOverride = useRef<boolean | null>(null);
  const reviewTips = useMemo(() => tips.filter(tip => tip.turn <= turn)
    .sort((left, right) => left.turn - right.turn), [tips, turn]);
  const currentPopupTips = useMemo(() => popupTips.filter(tip => tip.turn === turn), [popupTips, turn]);
  const automaticOpen = allowPopup && showTips && currentPopupTips.length > 0;
  const open = reviewOpen || automaticOpen;
  const visibleTips = reviewOpen ? reviewTips : currentPopupTips;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const enabled = showTipsOverride.current ?? (readCookie(showTipsCookie) !== 'false');
      setShowTips(enabled);
      setPopupTips(allowPopup && enabled ? tips.filter(tip => {
        const cookie = seenTipCookie(gameId, tip);
        return tip.turn === turn && !seenTips.current.has(cookie) && readCookie(cookie) !== 'true';
      }) : []);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [allowPopup, gameId, tips, turn]);

  useEffect(() => {
    if (!open) return;
    for (const tip of visibleTips) {
      const cookie = seenTipCookie(gameId, tip);
      if (!seenTips.current.has(cookie)) {
        seenTips.current.add(cookie);
        writeCookie(cookie, 'true');
      }
    }
  }, [gameId, open, visibleTips]);

  const close = () => {
    setPopupTips([]);
    if (reviewOpen) onReviewClose();
  };

  const changeShowTips = (checked: boolean) => {
    showTipsOverride.current = checked;
    writeCookie(showTipsCookie, String(checked));
    setShowTips(checked);
    if (!checked) setPopupTips([]);
  };

  return (
    <Dialog.Root open={open} onOpenChange={isOpen => { if (!isOpen) close(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={`DialogOverlay ${styles.overlay}`} />
        <Dialog.Content className={`DialogContent ${styles.dialog}`}>
          <Dialog.Title className={`DialogTitle ${styles.title}`}>{reviewOpen ? 'Game Tips' : 'Game Tip'}</Dialog.Title>
          <Dialog.Description asChild>
            <div className={styles.body}>
              {visibleTips.length > 0 ? <ol className={styles.tips}>
                {visibleTips.map(tip => <li key={seenTipCookie(gameId, tip)} className={styles.tip}>
                  <Markdown>{tip.markDownMessage}</Markdown>
                </li>)}
              </ol> : <p>No tips are available yet.</p>}
            </div>
          </Dialog.Description>
          <div className={styles.footer}>
            <label className={styles.showTips}>
              <input type="checkbox" checked={showTips} onChange={event => changeShowTips(event.target.checked)} />
              Show tips
            </label>
            <Dialog.Close className="btn" type="button">Got it</Dialog.Close>
          </div>
          <Dialog.Close className="DialogClose btn-secondary material-symbols-outlined" type="button" aria-label="Close tips">close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
