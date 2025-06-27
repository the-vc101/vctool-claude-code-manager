import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { execSync } from 'child_process';

function findClaudeConfigFile(): string | null {
  const homeDir = os.homedir();
  const claudeConfigPath = path.join(homeDir, '.claude.json');
  
  try {
    if (fs.existsSync(claudeConfigPath)) {
      return claudeConfigPath;
    }
  } catch (error) {
    // File doesn't exist or can't be accessed
  }
  
  return null;
}

export function backupCommand() {
  try {
    const claudeConfigPath = findClaudeConfigFile();
    
    if (!claudeConfigPath) {
      console.error(chalk.red('Claude config file (~/.claude.json) not found'));
      process.exit(1);
    }
    
    // Generate timestamp in the format: YYYY-MM-DDTHH:MM:SS+TIMEZONE
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, '') + 
      new Date().toString().match(/([+-]\d{4})/)?.[1] || '+0000';
    
    const backupPath = `${claudeConfigPath.replace('.json', '')}-${timestamp}.json`;
    
    // Copy the file
    fs.copyFileSync(claudeConfigPath, backupPath);
    
    console.log(chalk.green(`✓ Claude config backed up successfully`));
    console.log(chalk.dim(`  Source: ${claudeConfigPath}`));
    console.log(chalk.dim(`  Backup: ${backupPath}`));
    
  } catch (error) {
    console.error(chalk.red(`Error creating backup: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}