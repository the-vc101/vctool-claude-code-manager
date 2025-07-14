# Claude Code Task Monitor Usage Guide

## Overview
The CC Task Monitor provides a real-time, htop-like tree interface for monitoring Claude Code tasks across all sessions, organized hierarchically by session → agent → task.

## Installation & Setup

1. Build the project:
```bash
pnpm build
```

2. Run the monitor:
```bash
# Using built version
node dist/cli.js monitor

# Using development version
pnpm dev monitor

# Using installed version
ccm monitor
```

## Features

### Main Interface
- **Header**: Shows task statistics and session counts
- **Tree View**: Hierarchical display of sessions → agents → tasks
- **Footer**: Shows available keyboard shortcuts

### Tree Structure
```
📁 Session: 001988f9...                    # 一个 Claude Code 会话
  🤖 Agent: 001988f9...                    # 主 Agent (会话ID同名)
    ⏳ pending 🔴 high 实现新功能
    🔄 in_progress 🟡 medium 修复bug
    ✅ completed 🟢 low 完成测试
  🤖 Agent: 002345ab...                    # 子 Agent (处理复杂任务)
    ⏳ pending 🔴 high 协作处理的任务
```

### Session 和 Agent 的关系
- **Session**: 一个完整的 Claude Code 会话，有唯一的 session ID
- **Agent**: 在会话中处理任务的执行单元，可能有多个
  - 通常第一个 Agent 的 ID 与 Session ID 相同（主 Agent）
  - 复杂任务可能创建额外的 Agent 来协作处理
  - 每个 Agent 维护自己的任务列表（todo list）

### Status Icons
- ⏳ **Pending**: Task not started
- 🔄 **In Progress**: Task being worked on
- ✅ **Completed**: Task finished

### Priority Icons
- 🔴 **High**: Critical priority
- 🟡 **Medium**: Normal priority
- 🟢 **Low**: Low priority

## Keyboard Controls

| Key | Action |
|-----|--------|
| `↑/↓` or `j/k` | Navigate up/down in tree |
| `Space` | Expand/collapse tree nodes |
| `Enter` | Show details (task/agent/session) |
| `Tab` | Cycle filters (all/pending/in_progress/completed/active_only) |
| `A` | Quick switch to Active Only filter |
| `S` | Cycle sort options (priority/status/modified/session) |
| `R` | Manual refresh |
| `F1` | Show help |
| `Q` or `Esc` | Quit |

## Data Sources

### Todo Files
- **Location**: `~/.claude/todos/`
- **Format**: `[session-id]-agent-[agent-id].json`
- **Content**: Array of todo objects with status, priority, and content

### Database Integration
- **Location**: `~/.claude/db.sql`
- **Purpose**: Tool execution tracking and session history
- **Access**: Read-only for monitoring

## Real-time Updates

The monitor automatically:
- Watches for file changes in the todo directory
- Refreshes data every 2 seconds
- Updates the interface in real-time
- Handles session creation/deletion dynamically

## Filtering Options

- **All**: Show all tasks (default)
- **Pending**: Show only pending tasks
- **In Progress**: Show only tasks being worked on
- **Completed**: Show only finished tasks
- **Active Only**: Show only pending + in-progress tasks (快捷键: A)

## Sorting Options

- **Priority**: Sort by task priority (high → low)
- **Status**: Sort by task status (in_progress → pending → completed)
- **Modified**: Sort by last file modification time
- **Session**: Sort by session ID alphabetically

## Multi-level Details View

Press `Enter` on different tree levels to view:

### Task Details
- Full task content
- Session and agent information
- Task metadata (priority, status, ID)
- All tasks in the same session
- Last modified timestamp

### Agent Details
- Agent ID and session information
- Task statistics (pending/in_progress/completed)
- Complete task list for this agent
- Last modified timestamp
- File path

### Session Details
- Session overview with agent count
- Total task statistics across all agents
- List of all agents in the session
- Hierarchical task breakdown

## Troubleshooting

### Common Issues

1. **Empty Task List**
   - Check if `~/.claude/todos/` directory exists
   - Verify Claude Code is generating todo files
   - Ensure proper permissions on the directory

2. **Database Connection Warning**
   - Normal if `~/.claude/db.sql` doesn't exist
   - Monitor will work without database integration
   - Run `ccm init` to set up tracking

3. **Terminal Display Issues**
   - Ensure terminal supports colors and Unicode
   - Try resizing terminal window
   - Use standard terminal (not IDE embedded)

### Performance Tips

- Monitor handles hundreds of tasks efficiently
- File watching is optimized for minimal CPU usage
- Database queries are cached and rate-limited
- UI updates are throttled to prevent flickering

## Examples

### Basic Usage
```bash
# Start monitoring
ccm monitor

# Use arrow keys to navigate tree
# Press Space to expand/collapse nodes
# Press Tab to filter by status
# Press A for Active Only filter (只看正在进行的)
# Press S to change sorting
# Press Enter for multi-level details
# Press Q to quit
```

### Typical Workflow
1. Start monitor in one terminal
2. Run Claude Code sessions in other terminals
3. Watch tree structure build as sessions create tasks
4. Use Space to expand/collapse sessions and agents
5. Navigate to specific tasks using tree structure
6. Check multi-level details for comprehensive information

## Integration with Claude Code

The monitor integrates seamlessly with Claude Code's todo system:
- Automatically detects new sessions
- Shows tasks as they're created/updated
- Reflects real-time status changes
- Provides session-level organization

## System Requirements

- Node.js 18+
- Terminal with color support
- Access to `~/.claude/` directory
- Claude Code todo system enabled

## Advanced Features

### Hierarchical Session Management
- Groups tasks by session → agent → task structure
- Shows multi-level statistics and summaries
- Handles complex multi-agent sessions with visual clarity

### Tree-based Performance Monitoring
- Tracks task completion rates at all levels
- Shows session and agent activity levels
- Provides expandable real-time metrics

### Interactive Data Persistence
- Maintains tree expansion state across refreshes
- Preserves filter/sort preferences
- Handles graceful shutdowns with state cleanup