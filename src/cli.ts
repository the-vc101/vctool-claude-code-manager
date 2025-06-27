#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { statCommand } from './commands/stat';
import { backupCommand } from './commands/backup';

const program = new Command();

program
  .name('claude-code-manager')
  .description('A CLI tool to assist with Claude Code vibe coding workflows')
  .version('1.0.0');

program
  .command('stat')
  .description('Display Claude Code session statistics')
  .option('-w, --width <number>', 'Maximum display width', '80')
  .option('--sort-by <method>', 'Sort method: ascii, size, +ascii, -ascii, +size, -size', 'ascii')
  .action(statCommand);

program
  .command('backup')
  .description('Backup Claude config file (~/.claude.json)')
  .action(backupCommand);

program.parse();