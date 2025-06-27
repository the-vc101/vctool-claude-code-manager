#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { statCommand } from './commands/stat';
import { backupCommand } from './commands/backup';

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

program.parse();