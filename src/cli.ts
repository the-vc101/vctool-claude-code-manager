#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { statCommand } from './commands/stat';

const program = new Command();

program
  .name('vctool')
  .description('A CLI tool to assist with Claude Code vibe coding workflows')
  .version('1.0.0');

program
  .command('stat')
  .description('Display Claude Code session statistics')
  .option('-w, --width <number>', 'Maximum display width', '80')
  .action(statCommand);

program.parse();