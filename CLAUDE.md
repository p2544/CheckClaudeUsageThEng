# Claude Code Usage Dashboard

## Project Overview

Local dashboard for visualizing Claude Code token usage and estimated API costs.
Reads `.jsonl` session logs from `~/.claude/projects/`, parses token data, stores in SQLite, displays via web dashboard.

**Stack:** TanStack Start (Vite SSR) + TanStack Router/Query + Recharts + better-sqlite3 + Drizzle ORM + Tailwind v4 + PDFKit

## Key Commands

```bash
pnpm dev          # Start dev server (localhost:3000)
pnpm sync         # CLI sync: parse Claude Code logs into SQLite cache
pnpm build        # Production build
```

## Architecture

### Data Flow
```
~/.claude/projects/**/*.jsonl → Stream Parser → SQLite (data/cache.db) → Server Functions → Dashboard
```

### Critical Constraint: TanStack Start Server Functions

**DO NOT export plain functions from server function files** (`src/server/functions/*.ts`) that import Node-only modules (better-sqlite3, pdfkit, fs, etc). TanStack Start only strips `createServerFn()` calls from the client bundle — any other exported function will leak Node modules into the browser and cause `promisify is not a function` errors.

- Server functions use `createServerFn({ method: 'GET' }).handler(async () => { ... })`
- The `.inputValidator()` chain gets stripped by the compiler — avoid relying on `data` parameter for simple queries. Use separate server functions per variant instead (e.g., `getOverview30d`, `getOverview90d`, `getOverviewAll`)
- For code that needs Node modules AND is called from server functions (like PDF generation), use **dynamic imports** inside the handler: `const { getDb } = await import('~/server/db/client')`

### Design System

Warm parchment theme from `DESIGN.md`. Key colors:
- Parchment `#f5f4ed` (page bg), Ivory `#faf9f5` (cards), Terracotta `#c96442` (CTA only)
- All grays are warm-toned (no cool blue-grays)
- Georgia serif for headings, system-ui for body
- Ring shadows (`0px 0px 0px 1px`) instead of drop shadows

Colors defined in `src/styles/globals.css` via Tailwind v4 `@theme inline` block.

## Project Structure

```
src/
├── routes/                    # TanStack Router file-based routes
│   ├── __root.tsx             # App shell: sidebar + QueryClientProvider
│   ├── index.tsx              # Overview dashboard (KPIs, charts, period filter)
│   ├── projects/              # Project list + detail pages
│   ├── sessions/              # Session list + detail (message timeline)
│   ├── models.tsx             # Model comparison
│   ├── cache-analysis.tsx     # Cache efficiency analytics
│   └── settings.tsx           # Pricing table, sync controls
├── server/
│   ├── functions/             # TanStack Start server functions (RPC endpoints)
│   │   ├── get-overview.ts    # Overview data (3 variants: 30d/90d/all)
│   │   ├── get-model-stats.ts
│   │   ├── get-cache-stats.ts
│   │   ├── get-projects.ts    # Project list + detail (uses inputValidator)
│   │   ├── get-sessions.ts    # Session list + detail (uses inputValidator)
│   │   ├── sync-logs.ts       # Incremental log sync
│   │   └── export-pdf.ts      # PDF generation (all imports dynamic)
│   ├── claude-logs/
│   │   ├── paths.ts           # Scan ~/.claude/projects/, decode folder names
│   │   ├── reader.ts          # Stream .jsonl files with byte offset tracking
│   │   └── parser.ts          # Parse entries: assistant→tokens, system→duration, ai-title→title
│   ├── db/
│   │   ├── schema.ts          # Drizzle schema: projects, sessions, messages, syncState
│   │   └── client.ts          # SQLite connection (auto-creates tables)
│   └── pdf/
│       └── report-builder.ts  # PDFKit report: header, KPIs, tables, footers
├── components/
│   ├── period-filter.tsx      # Shared 30d/90d/All Time toggle
│   └── export-button.tsx      # PDF export modal with account name input
├── lib/
│   ├── pricing.ts             # Model pricing (verified 2026-04-14) + cost calculator
│   ├── schemas.ts             # Zod v4 schemas for log entry types
│   └── format.ts              # formatTokens, formatCost, formatPercent, formatDuration
└── styles/
    └── globals.css            # Tailwind v4 theme + warm parchment design tokens
```

## Log Entry Types

Only these types are processed from `.jsonl` files:
- `assistant` — token usage (input, output, cache_creation, cache_read + ephemeral breakdown)
- `system` with `subtype: "turn_duration"` — session duration
- `ai-title` / `custom-title` — session names
- Everything else (user, progress, queue-operation, etc.) is skipped

Filter out: `model === "<synthetic>"` and zero-token entries.

## Pricing

Prices in `src/lib/pricing.ts`, last verified 2026-04-14 from platform.claude.com/docs.
Cache pricing has 5-minute and 1-hour write tiers — the calculator uses ephemeral breakdown when available.

## Database

SQLite at `data/cache.db` (gitignored). Auto-created on first `getDb()` call.
Incremental sync via `lastParsedOffset` per session file — only parses new bytes.

## PDF Export

Uses PDFKit (Node.js only). All imports in `export-pdf.ts` are dynamic to prevent browser bundling.
Returns base64-encoded PDF via server function → client decodes and triggers download.
Uses `bufferPages: true` to draw footers after all content is written.
