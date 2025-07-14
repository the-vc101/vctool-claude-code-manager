# Claude Code Manager (CCM)

A powerful CLI tool for managing Claude Code workflows with **automatic execution tracking** and analytics.

## ✨ Installation

```bash
npm install -g vctool-claude-code-manager
```

## 🚀 Quick Start

```bash
# Interactive analyzer with timeline
ccm stat --analyzer

# Current project statistics  
ccm stat --current --full-message

# Real-time task monitoring
ccm monitor

# Analyze your usage and costs
ccm usage daily --breakdown
```

## ⭐ Key Features

### 📈 **Automatic Execution Tracking**
- Zero configuration - works immediately after installation
- Timeline visualization with D3.js
- Success/error tracking with visual indicators
- Real-time filtering and analysis
- Privacy-first local storage

### 🔍 **Interactive Web Analyzer**
- Modern web dashboard with three views:
  - Overview - project statistics and charts
  - Treemap - visual project size comparison
  - Timeline - interactive execution pattern analysis
- Responsive design for desktop and mobile

### 📊 **Session Analytics**
- Detailed project breakdowns and statistics
- Full conversation history analysis
- Current project focus and filtering
- Comprehensive token usage and cost analysis

### 🛠️ **Project Management & Monitoring**
- Smart backup and cleanup utilities
- Real-time task monitoring (htop-like interface)
- Project tracking and organization
- Usage monitoring and optimization

## Requirements

- Node.js >= 18.0.0
- Claude Code installed and configured

## Commands

### `ccm stat` - Project Analytics
- View session statistics and conversation history
- Interactive web analyzer with timeline visualization
- Export data in JSON/Markdown formats

### `ccm monitor` - Real-time Task Monitoring
- htop-like interface for Claude Code tasks
- Hierarchical view: Project → Session → Agent → Task
- Real-time updates with filtering and sorting

### `ccm usage` - Token Analysis
- Daily/monthly usage reports with cost breakdown
- Session-level analysis and real-time monitoring
- Wrapper for ccusage package

### `ccm init` - Setup & Management
- Initialize tracking system
- Verify setup status
- Force reinitialize if needed

### Utilities
- `ccm backup` - Backup Claude config
- `ccm slim` - Clean up old project entries
- `ccm track` - Internal tracking command

## Setup & Configuration

### Automatic Setup (Recommended)
```bash
npm install -g vctool-claude-code-manager
# That's it! Tracking is automatically configured
```

### Manual Setup (Advanced)
```bash
ccm init                      # Initialize tracking manually
ccm init --check              # Verify setup status
```

### Data Storage
- **Database**: `~/.claude/db.sql` (SQLite, local storage)
- **Hooks Config**: `~/.claude/settings.json` (auto-configured)
- **Privacy**: No data sent to external servers

## Links & Resources

- **GitHub**: [https://github.com/markshawn2020/vctool-claude-code-manager](https://github.com/markshawn2020/vctool-claude-code-manager)
- **NPM**: [https://www.npmjs.com/package/vctool-claude-code-manager](https://www.npmjs.com/package/vctool-claude-code-manager)

## License

ISC

---

**Made for Claude Code power users** 🚀
