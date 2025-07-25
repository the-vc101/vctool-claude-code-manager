#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { statCommand } from './commands/stat';
import { backupCommand } from './commands/backup';
import { slimCommand } from './commands/slim';
import { usageCommand } from './commands/usage';
import { trackCommand } from './commands/track';
import { initCommand } from './commands/init';
import { monitorCommand } from './commands/monitor';
import { memoryCommand } from './commands/memory';
import { dashboardCommand } from './commands/dashboard';

const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const program = new Command();

program
  .name('claude-code-manager')
  .description('A CLI tool to assist with Claude Code vibe coding workflows')
  .version(packageJson.version);

program
  .command('stat')
  .description('Display Claude Code session statistics')
  .option('-w, --width <number>', 'Maximum display width', '80')
  .option('--sort-by <method>', 'Sort method: ascii, size, +ascii, -ascii, +size, -size', 'ascii')
  .option('--history-order <order>', 'History order: reverse (newest first), forward (oldest first)', 'reverse')
  .option('--current', 'Only show data for the current project')
  .option('--full-message', 'Show full history messages without truncation')
  .option('--with-ai', 'Include AI responses in conversation display')
  .option('--output-path <path>', 'Export data to file or directory (supports auto-naming)')
  .option('--output-format <format>', 'Export format: json, markdown (requires --output-path)', 'json')
  .option('--analyzer', 'Open interactive analyzer in browser')
  .action(statCommand);

program
  .command('backup')
  .description('Backup Claude config file (~/.claude.json)')
  .action(backupCommand);

program
  .command('slim')
  .description('Remove project entries from Claude config (keeps current directory by default)')
  .option('--force', 'Skip confirmation prompt')
  .option('--include-current', 'Also remove current directory from projects')
  .action(slimCommand);

program
  .command('usage')
  .description('Analyze Claude Code token usage and costs (wrapper for ccusage)')
  .argument('[subcommand]', 'Usage report type: daily, monthly, session, blocks (default: daily)')
  .option('--since <date>', 'Start date filter (format: YYYYMMDD)')
  .option('--until <date>', 'End date filter (format: YYYYMMDD)')
  .option('--json', 'Output in JSON format')
  .option('--breakdown', 'Show per-model cost breakdown')
  .option('--offline', 'Use offline mode (cached pricing data)')
  .option('--live', 'Real-time dashboard (use with blocks subcommand)')
  .action(usageCommand);

program
  .command('track')
  .description('Track Claude Code execution (used by hooks)')
  .action(trackCommand);

program
  .command('init')
  .description('Initialize Claude Code tracking (database + hooks)')
  .option('--force', 'Force reinitialize even if already set up')
  .option('--check', 'Check current setup status')
  .action(initCommand);

program
  .command('monitor')
  .description('Real-time monitoring of Claude Code tasks (htop-like interface)')
  .option('--display-mode <mode>', 'Display mode: tree, flat, list', 'flat')
  .option('--order <order>', 'Sort order: modified, priority, status, ascii', 'modified')
  .option('--filter <filter>', 'Filter: all, pending, in_progress, completed, active', 'active')
  .option('--project <project>', 'Filter by project path')
  .option('--reverse', 'Reverse sort order')
  .option('--refresh-interval <seconds>', 'Refresh interval in seconds', '2')
  .action(monitorCommand);

program
  .command('memory')
  .description('Display all Claude Code memory files (CLAUDE.md and CLAUDE.local.md)')
  .option('--paths-only', 'Show only file paths without content preview')
  .option('--full', 'Show full content of all memory files')
  .option('--exclude <patterns...>', 'Exclude directories from subtree search', [])
  .action((options) => memoryCommand(options));

program
  .command('dashboard')
  .description('Interactive usage analytics dashboard for Claude Code token usage and costs')
  .option('--export <path>', 'Export data to file instead of opening dashboard')
  .option('--format <format>', 'Export format: json, csv (requires --export)', 'json')
  .action(dashboardCommand);

program.parse();