import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

interface HistoryItem {
  display: string;
}

interface ProjectData {
  history?: HistoryItem[];
  [key: string]: any;
}

interface ClaudeData {
  projects: Record<string, ProjectData>;
}

interface ProcessedProject {
  path: string;
  totalSize: number;
  historyItems: Array<{
    display: string;
    size: number;
  }>;
}

function lpad(str: string, length: number, padChar: string = '0'): string {
  return str.length < length ? padChar.repeat(length - str.length) + str : str;
}

function findClaudeDataFile(): string | null {
  const homeDir = os.homedir();
  const files = fs.readdirSync(homeDir);
  
  const claudeFiles = files.filter(file => 
    file.startsWith('.claude-') && file.endsWith('.json')
  );
  
  if (claudeFiles.length === 0) {
    return null;
  }
  
  // Return the most recent file
  claudeFiles.sort((a, b) => b.localeCompare(a));
  return path.join(homeDir, claudeFiles[0]);
}

export function statCommand(options: { width?: string }) {
  const width = parseInt(options.width || '80', 10);
  
  try {
    const dataFilePath = findClaudeDataFile();
    if (!dataFilePath) {
      console.error(chalk.red('No Claude data file found in home directory'));
      process.exit(1);
    }
    
    const rawData = fs.readFileSync(dataFilePath, 'utf8');
    const data: ClaudeData = JSON.parse(rawData);
    
    if (!data.projects) {
      console.log(chalk.yellow('No projects found in Claude data'));
      return;
    }
    
    // Process projects
    const projects: ProcessedProject[] = Object.entries(data.projects)
      .map(([projectPath, projectData]) => {
        const historyItems = (projectData.history || []).map(item => ({
          display: item.display,
          size: JSON.stringify(item).length
        }));
        
        return {
          path: projectPath,
          totalSize: JSON.stringify(projectData).length,
          historyItems
        };
      })
      .sort((a, b) => b.totalSize - a.totalSize);
    
    // Display results
    projects.forEach(project => {
      console.log('──────────────────────────────────────────────────');
      console.log(chalk.cyan(`Project: ${project.path}`));
      console.log(chalk.gray(`  - TOTAL SIZE: ${project.totalSize} bytes`));
      console.log(chalk.gray(`  - History Details (${project.historyItems.length} entries):`));
      
      project.historyItems.forEach((item, index) => {
        const lineNumber = lpad((index + 1).toString(), 2, '0');
        const content = item.display
          .replace(/\n/g, ' ')
          .substring(0, width > 3 ? width - 3 : width);
        const truncated = item.display.replace(/\n/g, ' ').length > width - 3 ? '...' : '';
        
        console.log(`  ${chalk.yellow(lineNumber)}. ${content}${chalk.gray(truncated)}`);
      });
    });
    
  } catch (error) {
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}