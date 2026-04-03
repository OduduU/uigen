# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Setup (first time)
npm run setup           # install deps + prisma generate + migrate

# Development
npm run dev             # Next.js dev server with turbopack on localhost:3000

# Build & lint
npm run build
npm run lint

# Testing
npm run test            # vitest (all tests)
npx vitest run <file>   # single test file

# Database
npx prisma migrate dev  # apply new migrations
npm run db:reset        # reset database (destructive)
npx prisma generate     # regenerate client after schema changes
```

The dev server requires `NODE_OPTIONS='--require ./node-compat.cjs'` — already baked into the `npm run dev` script.

An `ANTHROPIC_API_KEY` in `.env` enables real AI generation. Without it, the app falls back to `MockLanguageModel` in `/src/lib/provider.ts`.

## Architecture

**Next.js 15 App Router** with a 35/65 split layout: chat panel (left) + preview/code editor (right).

### AI Generation Pipeline

1. User sends a message → `ChatContext` calls the Vercel AI SDK `useChat` hook
2. POST `/src/app/api/chat/route.ts` streams responses using `streamText` with two tools:
   - `str_replace_editor` — view/create/replace text in virtual files
   - `file_manager` — rename/delete files and directories
3. Tool calls are intercepted by `FileSystemContext` which applies them to the in-memory `VirtualFileSystem`
4. The preview renders the updated virtual file system in real time

### Virtual File System

`/src/lib/file-system.ts` — `VirtualFileSystem` class (~515 lines). Entirely in-memory; no disk writes. Supports CRUD on files/directories plus text-editor-style operations (`viewFile`, `replaceInFile`, `insertInFile`). Serialized to JSON for persistence in Prisma.

### State Management

Two React contexts wired in `/src/app/main-content.tsx`:
- **`FileSystemContext`** — owns virtual FS state, processes AI tool calls
- **`ChatContext`** — wraps `useChat`, manages messages and anonymous-user local storage

### Data Persistence

Prisma + SQLite. Schema has two models:
- `User` — email/password auth
- `Project` — `messages` and `data` stored as JSON strings (chat history + serialized VFS)

Projects are saved to the database at the end of each AI response in the chat API route.

### Authentication

JWT sessions via `jose` in `/src/lib/auth.ts` (server-only). 7-day cookies. `/src/middleware.ts` guards `/api/projects` and `/api/filesystem`.

### AI Model

Default: `claude-haiku-4-5-20251001` via `@ai-sdk/anthropic`. Configured in `/src/lib/provider.ts`. Swap the model there to change it globally.

### Testing

Vitest + jsdom + Testing Library. Test files live in `__tests__/` directories alongside components.
