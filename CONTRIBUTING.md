# Contributing to Claude Code Manager (CCM)

Thank you for your interest in contributing to CCM! This document provides guidelines for developers who want to contribute to the project.

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- pnpm (recommended) or npm
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/markshawn2020/claude-code-manager
   cd claude-code-manager
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Build the project**
   ```bash
   pnpm run build
   ```

4. **Link for global usage**
   ```bash
   pnpm link
   ```

5. **Test your changes**
   ```bash
   ccm stat
   ccm usage daily
   ```

### Development Scripts

- `pnpm run build`: Compile TypeScript to JavaScript in `dist/`
- `pnpm run dev`: Run in development mode with ts-node
- `pnpm run start`: Run the compiled version

### Project Structure

```
src/
├── cli.ts              # Main CLI entry point
├── commands/
│   ├── stat.ts        # Statistics command implementation
│   ├── backup.ts      # Backup command implementation
│   ├── slim.ts        # Slim command implementation
│   └── usage.ts       # Usage command implementation (ccusage wrapper)
└── utils/             # Utility functions (future expansion)
```

## Adding New Commands

1. **Create a new command file**
   ```bash
   # Create src/commands/your-command.ts
   touch src/commands/your-command.ts
   ```

2. **Implement the command function**
   ```typescript
   // src/commands/your-command.ts
   export function yourCommand(options: { /* your options */ }) {
     // Implementation here
   }
   ```

3. **Register the command in CLI**
   ```typescript
   // src/cli.ts
   import { yourCommand } from './commands/your-command';
   
   program
     .command('your-command')
     .description('Description of your command')
     .option('--option <value>', 'Option description')
     .action(yourCommand);
   ```

4. **Build and test**
   ```bash
   pnpm run build
   ccm your-command --help
   ```

## Code Style

- Use TypeScript with strict mode
- Follow existing code patterns and conventions
- Use descriptive variable and function names
- Add proper error handling
- Include JSDoc comments for public functions

## Testing

Currently, testing is manual. When adding new features:

1. Test all existing commands to ensure no regressions
2. Test edge cases (empty data, invalid options, etc.)
3. Test with different Claude Code project configurations

## Submitting Changes

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
4. **Test thoroughly**
5. **Commit with clear messages**
   ```bash
   git commit -m "Add: new feature description"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**

## Common Development Tasks

### Adding a New CLI Option

1. Add the option to the command definition in `src/cli.ts`
2. Update the command function signature in the respective command file
3. Implement the option logic
4. Update documentation

### Debugging

Use the development script to test changes:
```bash
pnpm run dev stat --current --full-message
```

### Working with Claude Data

The tool reads from `~/.claude.json`. You can create test data:
```json
{
  "projects": {
    "/path/to/test/project": {
      "history": [
        {"display": "Test history item 1"},
        {"display": "Test history item 2"}
      ]
    }
  }
}
```

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Test all commands
4. Create release tag
5. Publish to npm (maintainers only)

## Getting Help

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Provide detailed reproduction steps for bugs

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow the project's coding standards