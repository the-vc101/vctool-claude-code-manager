# Claude Code Manager

A CLI tool for managing Claude Code workflows with automatic execution tracking and analytics.

## Quick Start

```bash
npm install -g vctool-claude-code-manager
ccm init
```

## Features

- 📈 **Automatic Execution Tracking** - Zero config, works immediately
- 🔍 **Interactive Web Analyzer** - Timeline visualization with D3.js
- 📊 **Session Analytics** - Project breakdowns and conversation history
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

</details>

<details>
<summary><code>ccm stat</code> - Project Analytics</summary>

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

## Links

- [GitHub](https://github.com/markshawn2020/vctool-claude-code-manager)
- [NPM](https://www.npmjs.com/package/vctool-claude-code-manager)

---

**Requirements:** Node.js >= 18.0.0 + Claude Code
