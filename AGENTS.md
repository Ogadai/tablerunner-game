<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# General rules

- Don't automatically run unit tests unless I ask you to

## Project Overview
This is a web application built with Next.js and React,
TypeScript. It is designed for deployment to Vercel.

## Architecture
- Frontend components live in app.
- Backend services live in lib.
- Shared types live in lib.

## Coding Standards
- Use TypeScript with strict type checking.
- Prefer functional React components.
- Use async/await rather than promise chains.
- Follow existing naming conventions.
- Avoid introducing unnecessary dependencies.

## Development Rules
- Read existing code before modifying it.
- Make the smallest changes necessary.
- Preserve existing functionality unless
  explicitly instructed otherwise.
