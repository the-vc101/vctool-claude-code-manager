# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Code Manager is a TypeScript CLI tool that provides analytics and monitoring for Claude Code workflows. It automatically tracks tool executions via hooks and provides various analysis views including web-based analytics, real-time monitoring, and usage reporting.

## Build and Development Commands

```bash
# Build the project (TypeScript compilation + copy templates)
pnpm build

# Development mode (run without building)
pnpm dev

# Run the CLI (after building)
pnpm start

# Install dependencies
pnpm install
```

**Note:** No test framework is configured. Tests would need to be set up if required.

## Architecture

### Core Structure
- **Entry point:** `src/cli.ts` - Commander.js-based CLI with 7 main commands
- **Commands:** `src/commands/` - Each command is a separate module (init, stat, monitor, usage, backup, slim, track)
- **Templates:** `src/templates/` - HTML templates for web analyzer (copied to dist during build)
- **Database:** SQLite database at `~/.claude/db.sql` for execution tracking
- **Configuration:** Hook configuration in `configs/hooks-config.json`

### Key Components

1. **Execution Tracking System**
   - Uses Claude Code PostToolUse hooks to automatically track all tool executions
   - Stores data in SQLite with schema: executions table (id, session_id, timestamp, tool_name, tool_input, tool_response, project_path, duration_ms, success, error_message)
   - Zero-config setup via postinstall script

2. **Analytics Engine** 
   - `ccm stat` - Project statistics with web analyzer option
   - Interactive D3.js-based timeline visualization
   - Export functionality (JSON/Markdown)

3. **Real-time Monitor**
   - `ccm monitor` - htop-like interface for active Claude Code tasks
   - Hierarchical view: Project → Session → Agent → Task
   - Terminal UI using blessed library

4. **Usage Analysis**
   - `ccm usage` - Token usage and cost analysis wrapper
   - Integrates with external ccusage tool

### Database Operations
- All data stored locally in `~/.claude/db.sql`
- Schema focused on execution metadata, not file contents
- Commands: init (setup), track (record), stat (analyze), slim (cleanup)

### Hook Integration
- PostToolUse hook automatically installed during npm install
- Command: `npx ccm track`
- Configuration stored in `~/.claude/settings.json`

## Key File Locations

- Database: `~/.claude/db.sql`
- Claude settings: `~/.claude/settings.json` 
- Hook config template: `configs/hooks-config.json`
- Web analyzer template: `src/templates/analyzer.html`

## Development Notes

- TypeScript compilation targets ES2020/CommonJS
- Uses pnpm as package manager
- No utils directory - utility functions are inline in command files
- CLI uses Commander.js with comprehensive option parsing
- Web analyzer opens in default browser using 'open' package
- Real-time features use blessed for terminal UI