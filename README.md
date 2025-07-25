# Claude Code Manager

A CLI tool for managing Claude Code workflows with automatic execution tracking and analytics.

## Quick Start

```bash
npm install -g claude-code-manager
ccm init
ccm dashboard                   # Open usage analytics dashboard
```

## Features

- 📈 **Automatic Execution Tracking** - Zero config, works immediately
- 🔍 **Interactive Web Analyzer** - Timeline visualization with D3.js
- 📊 **Session Analytics** - Project breakdowns and conversation history
- 💰 **Usage Analytics Dashboard** - Interactive token usage and cost visualization
- 🛠️ **Real-time Task Monitoring** - htop-like interface for Claude Code tasks

## Commands

<details>
<summary><code>ccm init</code> - Setup & Management</summary>

Initialize and manage tracking system.

```bash
ccm init                   # Set up tracking
ccm init --check           # Verify setup
ccm init --force           # Force reinitialize
```

</details>

<details>
<summary><code>ccm stat</code> - View/Export Chats By Project</summary>

View session statistics and export data.

**Options:**
- `--analyzer` - Open web-based analyzer
- `--output-path <path>` - Export data (JSON/Markdown)
- `--current` - Current project only
- `--with-ai` - Include AI responses

```bash
ccm stat --analyzer        # Interactive web analyzer
ccm stat --output-path     # Export data
```

![`ccm stat --analyzer`](assets/ccm-stat-analyzer-demo.png)


```bash
ccm stat --current
```

![`ccm stat --current`](assets/ccm-current-user-messages.png)

</details>

<details>
<summary><code>ccm monitor</code> - Real-time Task Monitoring</summary>

htop-like interface for Claude Code tasks with hierarchical view.

```bash
ccm monitor
```

**Controls:**
- `Tab` - Filter tasks (all/pending/active/completed)
- `Space` - Expand/collapse tree nodes
- `Enter` - Show task details
- `A` - Active tasks only
- `Q` - Quit

**Tree Structure:** Project → Session → Agent → Task

![`ccm monitor`](assets/ccm-monitor-demo.png)

</details>

<details>
<summary><code>ccm usage</code> - Token Analysis</summary>

Analyze Claude Code token usage and costs.

```bash
ccm usage daily            # Daily usage report
ccm usage monthly          # Monthly aggregated report
ccm usage blocks --live    # Real-time dashboard
```

**Options:**
- `--since <date>` - Start date filter (YYYYMMDD)
- `--until <date>` - End date filter (YYYYMMDD)
- `--breakdown` - Show per-model costs
- `--json` - JSON output

**💡 Tip:** Use `ccm dashboard` for interactive visualization of usage data with charts and analytics.

</details>

<details>
<summary><code>ccm dashboard</code> - Interactive Usage Analytics</summary>

Interactive web-based dashboard for Claude Code token usage and cost visualization with smart data management.

```bash
ccm dashboard                    # Open interactive dashboard
ccm dashboard --refresh          # Force refresh data before opening
ccm dashboard --export data.json # Export processed data
```

**Key Features:**
- 📊 **Smart Data Management** - Auto-fetches fresh usage data (1-hour cache)
- 📈 **Multiple Chart Types** - Daily trends, token breakdowns, model statistics
- 🎯 **Interactive Visualizations** - D3.js charts with zoom, filter, and hover details
- 📤 **Export Options** - JSON and CSV formats for further analysis

**Dashboard Tabs:**
- **Overview** - Daily cost/token summary with area charts
- **Cost Trends** - Time series analysis with period filtering
- **Token Analysis** - Pie charts, stacked bars, and efficiency metrics
- **Models** - Model usage statistics and cost breakdowns
- **Export** - Data export and print functionality

**Options:**
- `--export <path>` - Export data instead of opening dashboard
- `--format <format>` - Export format: json, csv (default: json)
- `--refresh` - Force refresh usage data from ccusage

**Data Flow:**
- Automatically calls `ccm usage --json` when data is stale (>1 hour)
- Uses cached `.data/usage.json` for recent data to improve performance
- Graceful fallback to cached data if refresh fails

</details>

<details>
<summary><code>ccm memory</code> - Memory Discovery</summary>

Discover all Claude Code memory files (CLAUDE.md and CLAUDE.local.md) across your system with hierarchical display.

```bash
ccm memory                        # Show all memories with preview
ccm memory --paths-only           # List paths only  
ccm memory --full                 # Show full content
ccm memory --exclude node_modules dist  # Exclude directories
```

**Discovery Sources:**
- 🌍 **Global** - `~/.claude/` directory for project-independent memories
- 🔼 **Parent** - Ancestor directories up to root
- 📍 **Current** - Working directory  
- 🔽 **Subtree** - Nested subdirectories

**Options:**
- `--paths-only` - Show only file paths without content preview
- `--full` - Display complete file contents
- `--exclude <patterns...>` - Exclude directories from subtree search

</details>

<details>
<summary>Utilities</summary>

Additional tools for project management.

```bash
ccm backup                 # Backup Claude config
ccm slim                   # Clean up old entries
ccm track                  # Internal tracking (auto-used)
```

</details>

## Design

**Data Storage:**
- Database: `~/.claude/db.sql` (local SQLite)
- Config: `~/.claude/settings.json` (auto-configured)
- Usage Cache: `.data/usage.json` (1-hour smart caching for dashboard)

## Links

- [GitHub](https://github.com/markshawn2020/claude-code-manager)
- [NPM](https://www.npmjs.com/package/claude-code-manager)

---

**Requirements:** Node.js >= 18.0.0 + Claude Code
