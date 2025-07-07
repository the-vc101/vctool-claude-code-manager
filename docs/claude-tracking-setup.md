# Claude Code Execution Tracking

Automatic execution tracking for Claude Code with timeline visualization.

## Zero-Config Setup ✨

Just install and start using Claude Code! Everything is automatic:

```bash
npm install -g vctool-claude-code-manager
```

That's it! 🎉

The installation automatically:
- ✅ Sets up execution tracking hooks
- ✅ Creates SQLite database on first use
- ✅ Starts tracking all Claude Code tool executions

## Usage

### View Analytics
```bash
ccm stat --analyzer
```

Opens an interactive dashboard with:
- 📊 **Project Overview** - Size and usage statistics
- 🌳 **Treemap Visualization** - Visual project size comparison  
- 📈 **Timeline** - Tool execution patterns over time

### Check Status
```bash
ccm init --check
```

Verifies tracking is working properly.

## Manual Setup (Advanced)

If you prefer manual configuration:

### 1. Install Dependencies

```bash
# Install Node.js dependencies
pnpm install
```

### 2. Configure Claude Code Hooks

You need to add the tracking hook to your Claude Code settings. You can either:

#### Option A: Use the `/hooks` command in Claude Code
1. Run `/hooks` in Claude Code
2. Select `PostToolUse` event
3. Leave matcher empty (to track all tools)
4. Add this command:
   ```bash
   npx ccm track
   ```
5. Save to User settings (applies to all projects)

#### Option B: Manually edit settings file
Add this configuration to your `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "npx ccm track",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

### 3. Test the Setup

1. Run any Claude Code command that uses tools (e.g., ask Claude to read a file)
2. Check that the database was created:
   ```bash
   ls -la ~/.claude/db.sql
   ```
3. Verify data is being logged:
   ```bash
   sqlite3 ~/.claude/db.sql "SELECT COUNT(*) FROM executions;"
   ```

## Status Check

Check if tracking is properly configured:
```bash
ccm init --check
```

This will show:
- ✅/❌ Database status
- ✅/❌ Hooks configuration status

## View Timeline Analysis

After some executions have been tracked, you can view the timeline:

```bash
ccm stat --analyzer
```

This will open an interactive HTML report with:
- Overview of projects and execution statistics
- Treemap visualization of project sizes
- **Timeline visualization** showing execution patterns over time

## Database Schema

The tracking system creates a SQLite database at `~/.claude/db.sql` with this schema:

```sql
CREATE TABLE executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    timestamp DATETIME NOT NULL,
    tool_name TEXT NOT NULL,
    tool_input TEXT,
    tool_response TEXT,
    project_path TEXT,
    duration_ms INTEGER,
    success BOOLEAN,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Timeline Features

The timeline visualization provides:

- **Tool Distribution**: See which tools are used most frequently
- **Time Patterns**: Identify when you're most active with Claude Code
- **Success/Error Tracking**: Visual indicators for successful vs failed executions
- **Interactive Filtering**: Filter by tool type and time period
- **Session Tracking**: Group executions by session ID
- **Project Context**: See which projects have the most activity

## Data Privacy

- All data is stored locally in `~/.claude/db.sql`
- No data is sent to external servers
- You can delete the database file at any time to clear all tracking data
- The tracking script only logs metadata, not file contents

## Troubleshooting

### Tracking not working
- Reinstall globally: `npm install -g vctool-claude-code-manager`
- Check setup status: `ccm init --check`
- Manual setup: `ccm init`
- Run Claude Code with `--debug` to see hook execution logs

### Database issues
- Ensure SQLite3 is installed and accessible
- Check file permissions on `~/.claude/` directory
- Manually test the tracking: `echo '{"tool_name":"test","session_id":"test123"}' | npx ccm track`

### Timeline not showing data
- Verify executions are being recorded in the database
- Check that `ccm stat --analyzer` is using the latest version with timeline support
- Ensure the project has been built: `pnpm run build`