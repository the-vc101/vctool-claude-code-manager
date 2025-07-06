# Claude Code Manager (CCM)

A CLI tool to assist with Claude Code vibe coding workflows, providing utilities to analyze and manage your Claude Code sessions.

## Links

- **GitHub**: [https://github.com/yourusername/vctool-claude-code-manager](https://github.com/yourusername/vctool-claude-code-manager)
- **NPM**: [https://www.npmjs.com/package/vctool-claude-code-manager](https://www.npmjs.com/package/vctool-claude-code-manager)

## Features

- **Session Statistics**: Analyze your Claude Code session history with detailed project breakdowns
- **Project Tracking**: View all projects and their interaction history
- **Formatted Output**: Clean, readable output with color coding and truncation options

## Installation

### Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Build the project:
   ```bash
   pnpm run build
   ```
4. Link for global usage:
   ```bash
   npm link
   ```

### From NPM (when published)

```bash
npm install -g vctool-claude-code-manager
```

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
```

#### Example Output

```
──────────────────────────────────────────────────
Project: /Users/username/my-project
  - TOTAL SIZE: 15420 bytes
  - History Details (5 entries):
  01. Created new React component for user authentication
  02. Fixed TypeScript errors in login form validation...
  03. Added unit tests for authentication service
  04. Refactored user state management with Redux
  05. Updated documentation for new auth flow
```

## Commands

### `ccm stat`

Analyzes your Claude Code history file (typically `~/.claude-YYYY-MM-DDTHH:mm:ss+timezone.json`) and displays:

- Projects sorted by path (ASCII) or size based on `--sort-by` parameter
- Number of history entries per project
- Truncated display of each history item
- Formatted output with colors and indexing
- Configurable sorting with ascending/descending order support

## Development

### Project Structure

```
src/
├── cli.ts              # Main CLI entry point
├── commands/
│   └── stat.ts        # Statistics command implementation
└── utils/             # Utility functions (future expansion)
```

### Scripts

- `pnpm run build`: Compile TypeScript to JavaScript in `dist/`
- `pnpm run dev`: Run in development mode with ts-node
- `pnpm run start`: Run the compiled version

### Adding New Commands

1. Create a new file in `src/commands/`
2. Export a command function
3. Register it in `src/cli.ts`

## Requirements

- Node.js >= 18.0.0
- Claude Code installed and configured

## License

ISC