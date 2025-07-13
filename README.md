# Claude Code Manager (CCM)

A powerful CLI tool for managing Claude Code workflows with **automatic execution tracking** and analytics.

## ✨ Zero-Config Installation

```bash
npm install -g vctool-claude-code-manager
```

That's it! Start using Claude Code normally and executions will be **automatically tracked**.

## 🚀 Quick Start

```bash
# Interactive analyzer with timeline
ccm stat --analyzer

# Current project statistics  
ccm stat --current --full-message

# Check tracking status
ccm init --check

# Analyze your usage and costs
ccm usage daily --breakdown
```

## ⭐ Key Features

### 📈 **Automatic Execution Tracking** ✨
- **Zero Configuration** - Works immediately after installation  
- **Timeline Visualization** - Interactive D3.js timeline showing tool usage patterns
- **Success/Error Tracking** - Visual indicators with green/red color coding
- **Real-time Filtering** - Filter by tool type (Read, Edit, Bash, etc.) and time period
- **Privacy First** - All data stored locally in `~/.claude/db.sql`

### 🔍 **Interactive Web Analyzer** 
- Modern web-based dashboard with three powerful views:
  - **📊 Overview** - Project statistics and size distribution charts
  - **🌳 Treemap** - Visual project size comparison (webpack-style)
  - **📈 Timeline** - Interactive execution pattern analysis with filtering
- Responsive design supporting desktop and mobile

### 📊 **Session Analytics**
- Detailed project breakdowns and statistics
- Full conversation history analysis
- Current project focus and filtering
- Comprehensive token usage and cost analysis

### 🛠️ **Project Management**
- Smart backup and cleanup utilities
- Project tracking and organization
- Usage monitoring and optimization

## Installation

```bash
npm install -g vctool-claude-code-manager
```

## Requirements

- Node.js >= 18.0.0
- Claude Code installed and configured
- ccusage package (automatically installed via npx when using `ccm usage`)

## Usage

### Statistics Command

Display detailed statistics about your Claude Code sessions:

```bash
ccm stat
```

#### Options

- `-w, --width <number>`: Set maximum display width (default: 80)
- `--sort-by <method>`: Sort method - ascii, size, +ascii, -ascii, +size, -size (default: ascii)
- `--history-order <order>`: History order - reverse (newest first), forward (oldest first) (default: reverse)
- `--current`: Only show data for the current project
- `--full-message`: Show full history messages without truncation
- `--with-cc`: Include Claude Code responses in conversation display
- `--json-output <file>`: Export conversation data to JSON file (supports auto-naming for directories)
- `--analyzer`: Open interactive web-based analyzer (like webpack bundle analyzer)

#### Sorting Examples

```bash
ccm stat --sort-by ascii     # Sort by project path alphabetically (default)
ccm stat --sort-by size      # Sort by project size
ccm stat --sort-by +ascii    # Sort by path ascending
ccm stat --sort-by -ascii    # Sort by path descending  
ccm stat --sort-by +size     # Sort by size ascending
ccm stat --sort-by -size     # Sort by size descending

# History ordering examples
ccm stat --history-order reverse  # Show newest history first (default)
ccm stat --history-order forward  # Show oldest history first

# Current project and full message examples
ccm stat --current                # Show only current project data
ccm stat --full-message           # Show full history without truncation
ccm stat --current --full-message # Show current project with full messages

# Conversation export with Claude responses
ccm stat --current --with-cc     # Show conversations with Claude responses

# JSON export examples
ccm stat --current --with-cc --json-output conversations.json
ccm stat --json-output /exports/   # Auto-generates filename in directory

# Interactive analyzer (like webpack bundle analyzer)
ccm stat --analyzer               # Open web-based interactive analyzer
```

#### Usage Examples

**Basic usage - View all projects:**
```bash
ccm stat
```

**Current project only:**
```bash
ccm stat --current
```

**Show full messages without truncation:**
```bash
ccm stat --full-message
```

**Combined options for focused analysis:**
```bash
ccm stat --current --full-message --sort-by size
```

**Large display with detailed sorting:**
```bash
ccm stat --width 120 --sort-by -size --history-order forward
```

**Conversation analysis with Claude responses:**
```bash
ccm stat --current --with-cc      # Show conversations with Claude responses
ccm stat --with-cc --full-message # Full conversation history all projects
```

**JSON export for external analysis:**
```bash
ccm stat --current --with-cc --json-output data.json    # Export to specific file
ccm stat --json-output /exports/                        # Auto-generate filename
ccm stat --current --json-output ~/backups/             # Export current project
```

**Interactive web analyzer:**
```bash
ccm stat --analyzer               # Opens interactive analyzer in browser
ccm stat --current --analyzer     # Analyze only current project interactively
```

**Web Analyzer Interface:**

![Claude Code Session Analyzer](https://poketto.oss-cn-hangzhou.aliyuncs.com/b2c8ac37e1ebb97e98507a2e9f94fd18.png?x-oss-process=image/resize,w_800/quality,q_100/rotate,0)

*Interactive web-based analyzer with three views: Overview, Treemap, and Timeline visualization*

### 📈 Timeline Features
- **Interactive Timeline Chart** - D3.js-powered visualization showing tool execution patterns
- **Time-based Filtering** - View executions from last 24h, 7 days, 30 days, or all time
- **Tool-specific Analysis** - Filter by specific tools (Edit, Read, Bash, Grep, etc.)
- **Execution Status** - Green dots for successful executions, red for errors
- **Hover Details** - Rich tooltips showing session info, timestamps, and project context
- **Cross-platform** - Works on all modern browsers with responsive design

#### Example Output

**Standard output (`ccm stat`):**
```
────────────────────────────────────────────────────────────────────────────────
Project 01: /Users/username/my-react-app
  TOTAL SIZE: 15.42 KB
  History Details (8 entries):

  01. 实现用户登录功能，包含表单验证和错误处理
  02. 修复TypeScript类型错误，优化组件性能
  03. 添加单元测试覆盖认证服务相关功能
  04. 重构状态管理，使用Redux Toolkit替代原生Redux...
  05. 更新项目文档，补充API接口说明
  06. 优化打包配置，减小bundle体积
  07. 集成ESLint和Prettier，统一代码风格
  08. 部署到生产环境，配置CI/CD流程

────────────────────────────────────────────────────────────────────────────────
Project 02: /Users/username/data-analysis-tool
  TOTAL SIZE: 8.95 KB
  History Details (3 entries):

  01. 创建数据可视化图表组件
  02. 实现CSV文件导入和解析功能
  03. 添加数据过滤和排序功能...
```

**Current project with full messages (`ccm stat --current --full-message`):**
```
────────────────────────────────────────────────────────────────────────────────
Project 01: /Users/username/my-react-app
  TOTAL SIZE: 15.42 KB
  History Details (3 entries):

  01. 实现用户登录功能，包含表单验证和错误处理，支持邮箱和用户名两种登录方式，集成JWT认证机制
  02. 修复TypeScript类型错误，优化组件性能，使用React.memo和useMemo减少不必要的重新渲染
  03. 添加单元测试覆盖认证服务相关功能，使用Jest和React Testing Library编写测试用例
```

## 📋 Complete Command Reference

### `ccm stat` - Project Analytics

Analyzes your Claude Code sessions and provides multiple visualization options:

**Console Output:**
- Projects sorted by path (ASCII) or size based on `--sort-by` parameter
- Number of history entries per project
- Truncated display of each history item
- Formatted output with colors and indexing
- Configurable sorting with ascending/descending order support

**Web Analyzer (`--analyzer`):**
- **📊 Overview Tab** - Project statistics, size charts, and summaries
- **🌳 Treemap Tab** - Visual comparison of project sizes (webpack-style)
- **📈 Timeline Tab** - Interactive execution timeline with filtering

### `ccm init` - Setup & Management

Initialize and manage Claude Code execution tracking:

```bash
ccm init              # Set up tracking (database + hooks)
ccm init --check      # Verify current setup status
ccm init --force      # Force reinitialize
```

### `ccm track` - Manual Tracking

Internal command used by hooks for logging executions:

```bash
echo '{"session_id":"test","tool_name":"Read"}' | ccm track
```

### `ccm usage` - Token Analysis

Analyzes Claude Code token usage and costs (wrapper for ccusage):

```bash
ccm usage                    # Daily report (default)
ccm usage daily              # Daily token usage and costs
ccm usage monthly            # Monthly aggregated report
ccm usage session            # Usage by conversation session
ccm usage blocks             # 5-hour billing windows
ccm usage blocks --live      # Real-time usage dashboard
```

#### Options

- `--since <date>`: Start date filter (format: YYYYMMDD)
- `--until <date>`: End date filter (format: YYYYMMDD)
- `--json`: Output in JSON format
- `--breakdown`: Show per-model cost breakdown
- `--offline`: Use offline mode (cached pricing data)
- `--live`: Real-time dashboard (use with blocks subcommand)

#### Usage Examples

**Basic usage analysis:**
```bash
ccm usage                        # Today's usage summary
ccm usage daily                  # Daily usage report
ccm usage monthly                # Monthly aggregated report
```

**Date range analysis:**
```bash
ccm usage daily --since 20250101 --until 20250107    # Weekly report
ccm usage monthly --since 20250101                   # From specific date
```

**Detailed cost breakdown:**
```bash
ccm usage daily --breakdown       # Show per-model costs
ccm usage monthly --json          # JSON output for processing
ccm usage session --breakdown     # Session-level analysis
```

**Real-time monitoring:**
```bash
ccm usage blocks --live           # Live usage dashboard
```

#### Example Output

**Daily usage report (`ccm usage daily`):**
```
Claude Code Usage Report - Daily
Date Range: 2025-01-15 to 2025-01-15

Total Input Tokens: 15,420
Total Output Tokens: 8,950
Total Cost: $0.85

Model Breakdown:
- Claude 3.5 Sonnet: $0.65 (12,300 in, 6,200 out)
- Claude 3 Haiku: $0.20 (3,120 in, 2,750 out)
```

**Monthly breakdown (`ccm usage monthly --breakdown`):**
```
Claude Code Usage Report - Monthly
Date Range: 2025-01-01 to 2025-01-31

Total Input Tokens: 485,230
Total Output Tokens: 298,450
Total Cost: $24.75

Daily Averages:
- Input: 15,652 tokens/day
- Output: 9,627 tokens/day
- Cost: $0.80/day

Top Usage Days:
1. 2025-01-15: $2.30 (35K tokens)
2. 2025-01-22: $1.95 (28K tokens)
3. 2025-01-08: $1.75 (25K tokens)
```

### `ccm backup` & `ccm slim` - Project Management

Additional utilities for managing your Claude Code environment:

```bash
ccm backup                    # Backup Claude config file
ccm slim                      # Clean up old project entries
ccm slim --force              # Force cleanup without confirmation
ccm slim --include-current    # Also remove current directory
```

## 🔧 Setup & Configuration

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

## 🚀 Advanced Usage

### Timeline Analysis Workflows
```bash
# Daily development pattern analysis
ccm stat --analyzer
# → Click Timeline tab → Select "Last 24 Hours"

# Tool-specific usage patterns  
ccm stat --analyzer
# → Click Timeline tab → Filter by "Edit" or "Bash"

# Error pattern investigation
ccm stat --analyzer  
# → Timeline shows red dots for failed executions
```

### Automation & Integration
```bash
# Check tracking status in scripts
ccm init --check && echo "Tracking OK"

# Export data for external analysis
sqlite3 ~/.claude/db.sql "SELECT * FROM executions" > executions.csv
```

## 🐛 Troubleshooting

### Timeline Not Showing
```bash
pnpm run build              # Rebuild if developing locally
ccm init --force            # Reinitialize setup
```

### Tracking Not Working  
```bash
ccm init --check            # Check setup status
ccm init                    # Reconfigure if needed
```

### Database Issues
```bash
ls -la ~/.claude/db.sql     # Verify database exists
sqlite3 ~/.claude/db.sql "SELECT COUNT(*) FROM executions;"  # Check data
```

## 📚 Links & Resources

- **GitHub**: [https://github.com/markshawn2020/vctool-claude-code-manager](https://github.com/markshawn2020/vctool-claude-code-manager)
- **NPM**: [https://www.npmjs.com/package/vctool-claude-code-manager](https://www.npmjs.com/package/vctool-claude-code-manager)
- **Documentation**: [Claude Tracking Setup Guide](docs/claude-tracking-setup.md)

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.

## 📄 License

ISC

---

**Made for Claude Code power users** 🚀

> **Tip**: After installation, just use Claude Code normally. Check `ccm stat --analyzer` periodically to discover your development patterns and optimize your workflow!
