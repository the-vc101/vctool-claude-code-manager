# Claude Code Manager (CCM)

A CLI tool to assist with Claude Code vibe coding workflows, providing utilities to analyze and manage your Claude Code sessions.

## Links

- **GitHub**: [https://github.com/markshawn2020/vctool-claude-code-manager](https://github.com/markshawn2020/vctool-claude-code-manager)
- **NPM**: [https://www.npmjs.com/package/vctool-claude-code-manager](https://www.npmjs.com/package/vctool-claude-code-manager)

## Quick Start

```bash
# Install globally
npm install -g vctool-claude-code-manager

# View all your Claude Code projects
ccm stat

# Focus on current project  
ccm stat --current --full-message

# Open interactive web analyzer
ccm stat --analyzer

# Analyze your usage and costs
ccm usage daily --breakdown
```

## Features

- **🔍 Interactive Web Analyzer**: Modern web-based interface with treemap visualization (like webpack bundle analyzer)
- **📊 Session Statistics**: Analyze your Claude Code session history with detailed project breakdowns
- **📁 Project Tracking**: View all projects and their interaction history  
- **🎯 Current Project Focus**: Filter analysis to show only your current working project
- **📝 Full Message Display**: View complete conversation history without truncation
- **💰 Usage Analysis**: Comprehensive token usage and cost analysis (wrapper for ccusage)
- **🎨 Formatted Output**: Clean, readable output with color coding and flexible display options

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

**Interactive web analyzer:**
```bash
ccm stat --analyzer               # Opens interactive analyzer in browser
ccm stat --current --analyzer     # Analyze only current project interactively
```

**Web Analyzer Interface:**

![Claude Code Session Analyzer](![](https://poketto.oss-cn-hangzhou.aliyuncs.com/b2c8ac37e1ebb97e98507a2e9f94fd18.png?x-oss-process=image/resize,w_800/quality,q_100/rotate,0))

*Interactive web-based analyzer showing project statistics, size distribution, and treemap visualization*

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

## Commands

### `ccm stat`

Analyzes your Claude Code history file (typically `~/.claude-YYYY-MM-DDTHH:mm:ss+timezone.json`) and displays:

- Projects sorted by path (ASCII) or size based on `--sort-by` parameter
- Number of history entries per project
- Truncated display of each history item
- Formatted output with colors and indexing
- Configurable sorting with ascending/descending order support

### `ccm usage`

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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.

## License

ISC
