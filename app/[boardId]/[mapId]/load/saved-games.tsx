'use client';

import { useRef, useState, useSyncExternalStore } from 'react';
import { listSavedGames } from '@/lib/store/saveGameBlobs';
import type { ApiResponse } from '@/lib/api-response';
import type { SavedGameList } from '@/lib/store/savedGameTypes';
import styles from './saved-games.module.css';

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const subscribeToHydration = () => () => {};

export default function SavedGames({ boardId, mapId, initialResult }: {
  boardId: string;
  mapId: string;
  initialResult: ApiResponse<SavedGameList>;
}) {
  const [data, setData] = useState(initialResult.success ? initialResult.data : undefined);
  const [error, setError] = useState(initialResult.success ? '' : 'Unable to retrieve saved games. Please try again.');
  const [loading, setLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const requestPending = useRef(false);
  // Wait for hydration before formatting in the browser's local timezone.
  const isClient = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  async function fetchPage(cursor: string | undefined, nextIndex: number) {
    if (requestPending.current) return;
    requestPending.current = true;
    setLoading(true);
    setError('');
    try {
      const result = await listSavedGames(boardId, mapId, cursor);
      if (!result.success || !result.data) {
        setError('Unable to retrieve saved games. Please try again.');
        return;
      }
      setData(result.data);
      setPageIndex(nextIndex);
      setCursors(previous => [...previous.slice(0, nextIndex), cursor]);
    } catch {
      setError('Unable to retrieve saved games. Please try again.');
    } finally {
      requestPending.current = false;
      setLoading(false);
    }
  }

  return (
    <section className={styles.page} aria-label="Saved games">
      {error && <p role="alert">{error}</p>}
      <div className={styles.tableContainer} tabIndex={0} role="region" aria-label="Saved games" aria-busy={loading}>
        {data && data.games.length > 0 && (
          <table className={styles.table} role="table">
            <thead>
              <tr>
                <th scope="col">Save name</th>
                <th scope="col">Players</th>
                <th scope="col">Turn</th>
                <th scope="col">Saved</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {data.games.map(game => (
                <tr key={game.pathname} role="row">
                  <th scope="row" role="rowheader" className={styles.saveName}>{game.saveName}</th>
                  <td role="cell"><span className={styles.mobileLabel} aria-hidden="true">Players</span>{game.playerCount}</td>
                  <td role="cell"><span className={styles.mobileLabel} aria-hidden="true">Turn</span>{game.turn}</td>
                  <td role="cell" className={styles.savedTime}>
                    <span className={styles.mobileLabel} aria-hidden="true">Saved</span>
                    <time dateTime={game.savedAt}>{isClient ? dateFormat.format(new Date(game.savedAt)) : '—'}</time>
                  </td>
                  <td role="cell" className={styles.loadButton}><button type="button" className="btn-secondary">
                    <span className="material-symbols-outlined">cloud_download</span></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && data.games.length === 0 && (
          <p>{pageIndex === 0 ? 'No saved games for this board and map yet.' : 'No saved games on this page.'}</p>
        )}
      </div>

      <nav className={styles.pagination} aria-label="Saved games pages">
        <button type="button" disabled={loading || pageIndex === 0}
          onClick={() => void fetchPage(cursors[pageIndex - 1], pageIndex - 1)}>
          Previous
        </button>
        <span role="status">{loading ? 'Loading saved games…' : `Page ${pageIndex + 1}`}</span>
        <button type="button" disabled={loading || !data?.hasMore || !data.cursor}
          onClick={() => void fetchPage(data?.cursor, pageIndex + 1)}>
          Next
        </button>
      </nav>
    </section>
  );
}
