# Claude Code Usage Dashboard

Local dashboard for visualizing token usage and estimated costs from [Claude Code](https://claude.ai/code) session logs.

> **Note:** This dashboard reads local Claude Code logs from `~/.claude/projects/`. It does NOT access the Anthropic API — all data comes from your local filesystem. Costs shown are **estimated equivalent API costs**, not actual charges (especially relevant for Claude Max subscribers).

![Dashboard Overview](docs/screenshot.png)

## Features

- **Overview** — KPI cards, daily cost trend, token breakdown (Input/Output/Cache), top projects
- **Projects** — Per-project breakdown with cost, sessions, model usage
- **Sessions** — Session list with drill-down to per-message timeline
- **Models** — Compare usage across Opus, Sonnet, Haiku
- **Cache Analysis** — Cache hit rate, estimated savings, per-project efficiency
- **Settings** — Pricing table, sync controls
- **Period Filter** — Switch between 30 days, 90 days, or all time
- **Warm Parchment Design** — Inspired by Anthropic's visual identity

## Requirements

- **Node.js** 20+
- **pnpm** 9+
- **Claude Code** installed and used (generates logs at `~/.claude/projects/`)

## Quick Start

```bash
# Clone
git clone <repo-url>
cd claude-usage-dashboard

# Install dependencies
pnpm install

# Sync Claude Code logs into local SQLite cache
pnpm sync

# Start dev server
pnpm dev
```

Open **http://localhost:3000** and click **Sync Now** to import your logs.

## How It Works

```
~/.claude/projects/**/*.jsonl  →  Stream Parser  →  SQLite Cache  →  Dashboard
```

1. **Parser** reads `.jsonl` session files from `~/.claude/projects/`
2. Extracts token usage from `assistant` entries (input, output, cache write, cache read)
3. Calculates estimated costs using [Anthropic's published pricing](https://docs.anthropic.com/en/docs/about-claude/pricing)
4. Stores parsed data in a local SQLite database (`data/cache.db`, gitignored)
5. Dashboard queries SQLite via TanStack Start server functions
6. **Incremental sync** — only parses new data since last sync (tracks byte offsets)

## Supported Models & Pricing

| Model | Input | Output | Cache Write (5m) | Cache Write (1h) | Cache Read |
|---|---|---|---|---|---|
| Opus 4.6 | $5/MTok | $25/MTok | $6.25/MTok | $10/MTok | $0.50/MTok |
| Sonnet 4.6 | $3/MTok | $15/MTok | $3.75/MTok | $6/MTok | $0.30/MTok |
| Haiku 4.5 | $1/MTok | $5/MTok | $1.25/MTok | $2/MTok | $0.10/MTok |

Pricing verified 2026-04-14. Dashboard warns if pricing data is >90 days old.

## Tech Stack

- [TanStack Start](https://tanstack.com/start) (Vite + SSR + Server Functions)
- [TanStack Router](https://tanstack.com/router) (File-based routing)
- [TanStack Query](https://tanstack.com/query) (Data fetching + caching)
- [Recharts](https://recharts.org/) (Charts)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) + [Drizzle ORM](https://orm.drizzle.team/) (Database)
- [Tailwind CSS v4](https://tailwindcss.com/) (Styling)
- [Lucide React](https://lucide.dev/) (Icons)
- [Zod v4](https://zod.dev/) (Schema validation)

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server with hot reload |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm sync` | Sync Claude Code logs (CLI, no server needed) |

## Privacy

- **No message content** is stored — only token counts and metadata
- All data stays on your local machine
- The SQLite cache (`data/cache.db`) is gitignored
- No network requests except to `localhost`

## License

MIT
