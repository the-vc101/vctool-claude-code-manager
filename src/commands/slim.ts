import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import * as readline from 'readline';

interface ClaudeData {
  projects: Record<string, any>;
  [key: string]: any;
}

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

function getCurrentDirectory(): string {
  return process.cwd();
}

function askConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

export async function slimCommand(options: { force?: boolean; includeCurrent?: boolean }) {
  try {
    const claudeConfigPath = findClaudeConfigFile();
    
    if (!claudeConfigPath) {
      console.error(chalk.red('Claude config file (~/.claude.json) not found'));
      process.exit(1);
    }
    
    // Read current config
    const rawData = fs.readFileSync(claudeConfigPath, 'utf8');
    const data: ClaudeData = JSON.parse(rawData);
    
    if (!data.projects) {
      console.log(chalk.yellow('No projects found in Claude config'));
      return;
    }
    
    const currentDir = getCurrentDirectory();
    const projectKeys = Object.keys(data.projects);
    const totalProjects = projectKeys.length;
    
    // Determine which projects to keep
    let projectsToKeep: string[] = [];
    if (!options.includeCurrent) {
      projectsToKeep = projectKeys.filter(key => key === currentDir);
    }
    
    const projectsToRemove = projectKeys.filter(key => !projectsToKeep.includes(key));
    const removedCount = projectsToRemove.length;
    
    if (removedCount === 0) {
      console.log(chalk.green('No projects to remove'));
      return;
    }
    
    // Show what will be removed
    console.log(chalk.yellow(`\nWill remove ${removedCount} project(s) out of ${totalProjects}:`));
    projectsToRemove.forEach(key => {
      console.log(chalk.dim(`  - ${key}`));
    });
    
    if (!options.includeCurrent && projectsToKeep.length > 0) {
      console.log(chalk.green(`\nWill keep current directory:`));
      projectsToKeep.forEach(key => {
        console.log(chalk.dim(`  + ${key}`));
      });
    }
    
    // Ask for confirmation unless --force is used
    if (!options.force) {
      console.log();
      const confirmed = await askConfirmation(
        chalk.red('This operation will permanently remove project data. Continue?')
      );
      
      if (!confirmed) {
        console.log(chalk.yellow('Operation cancelled'));
        return;
      }
    }
    
    // Create new projects object with only the projects to keep
    const newProjects: Record<string, any> = {};
    projectsToKeep.forEach(key => {
      newProjects[key] = data.projects[key];
    });
    
    // Update the data
    data.projects = newProjects;
    
    // Write back to file
    fs.writeFileSync(claudeConfigPath, JSON.stringify(data, null, 2));
    
    console.log(chalk.green(`✓ Successfully removed ${removedCount} project(s) from Claude config`));
    console.log(chalk.dim(`  Remaining projects: ${Object.keys(newProjects).length}`));
    
  } catch (error) {
    console.error(chalk.red(`Error slimming config: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}