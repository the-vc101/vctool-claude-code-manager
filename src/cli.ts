#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { statCommand } from './commands/stat';
import { backupCommand } from './commands/backup';
import { slimCommand } from './commands/slim';

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

program.parse();