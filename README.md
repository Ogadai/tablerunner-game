This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Saved games

`saveGameToBlob(boardId, mapId, saveName)` writes a new JSON snapshot to a
**private** Vercel Blob store. Configure `BLOB_READ_WRITE_TOKEN` for that store
alongside the existing Upstash Redis environment variables.

Saves use the prefix
`saved-games/${encodeURIComponent(boardId)}/${encodeURIComponent(mapId)}/`.
`listSavedGames(boardId, mapId, cursor?)` returns an `ApiResponse` whose `data`
contains `{ games, cursor, hasMore }`. Each page contains up to 20 saves in Blob
pathname order. Pass the returned cursor while `hasMore` is true. Each entry
includes `pathname`, save UUID, board/map IDs, name, player count and turn parsed
from the pathname, plus `savedAt` from Blob upload time. Listing does not download
snapshots. `gameId` remains in the snapshot and is not returned by listings.
An invalid pathname returns an error for the page.

New filenames contain the save UUID, player count, turn and URL-encoded name:
`<uuid>_players-<count>_turn-<turn>_name-<encoded-name>.json`.
Older filenames without `_name-...` can still be listed and loaded; their listing
name is `Saved game <uuid>` because the original name is only inside the snapshot.
The JSON contains `schemaVersion: 1`, `metadata` (including the save name and
timestamp), and `redisState`, a mapping from original Redis keys to their values.
Repeated save names create separate snapshots.

Snapshots include all current game-state key families, including queued actions,
messages, inventory/stat changes, shop stock, board settings and processing turn.
Temporary lock keys and expired values are excluded. Keys are discovered with
SCAN and their values read together with MGET; this is not a transaction spanning
key discovery or an entire turn update, so save while the game is idle for a
consistent turn checkpoint.

`loadGameFromBlob(boardId, mapId, pathname)` accepts a pathname returned by the
listing and returns `ApiResponse<void>`. It validates the snapshot version,
metadata, basic game structure and Redis key scope before changing Redis. Saves
can only be loaded into their original board/map. Loading replaces the current
state in a Redis transaction, removes existing state keys absent from the save,
applies the normal one-week expiry, and publishes game/ready-state updates.
Load while the game is idle: key discovery and other game writers are not covered
by the restore transaction. A notification failure is reported even if the Redis
restore already committed. Listing and loading UI are not implemented.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
