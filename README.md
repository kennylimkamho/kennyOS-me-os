# KennyOS - Personal Knowledge Operating System

A gamified personal AI brain that records every interaction and transforms it into actionable intelligence.

## Quick Start

```bash
# Install dependencies
bun install

# Run CLI
bun run dev

# Run MCP Server
bun run mcp

# Run Web Interface
bun run web
```

## Architecture

```
me-os/
├── src/
│   ├── database/       # SQLite database layer
│   ├── cli/            # Command-line interface
│   ├── mcp-server/     # MCP server for Claude Code
│   └── web/            # Web interface
├── database/            # SQLite database file
└── KennyOS-v2/         # Knowledge base (Git repo)
```

## CLI Commands

```bash
bun run dev capture "Quick idea"
bun run dev status
bun run dev search "query"
bun run dev decisions
bun run dev people
bun run dev article <url>
```

## MCP Tools

- `me_capture` - Capture to inbox
- `me_status` - Get game state
- `me_search` - Search knowledge
- `me_decisions_list` - List decisions
- `me_people_list` - List people
- `me_interaction` - Record person interaction

## Web Interface

Visit http://localhost:3000 for the chat interface with:
- Chat with AI brain
- Knowledge panel
- Game state (XP, Level, HP, MP)

## Deploy to Vercel

```bash
# Build for production
bun run build

# Deploy with Vercel
vercel deploy
```

## Tech Stack

- **Runtime:** Bun (fast, native SQLite)
- **Database:** SQLite (local) + Turso (cloud sync)
- **AI:** Claude API
- **Frontend:** HTML + vanilla JS (no framework)
- **Deployment:** Vercel