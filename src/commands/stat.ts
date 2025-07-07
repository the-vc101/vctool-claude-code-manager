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

function getCurrentDirectory(): string {
  return process.cwd();
}

function findClaudeDataFile(): string | null {
  const homeDir = os.homedir();
  return path.join(homeDir, ".claude.json");
}

function parseSortBy(sortBy: string): { method: 'ascii' | 'size'; ascending: boolean } {
  const trimmed = sortBy.trim();
  
  if (trimmed.startsWith('+')) {
    const method = trimmed.slice(1) as 'ascii' | 'size';
    return { method: method === 'ascii' || method === 'size' ? method : 'ascii', ascending: true };
  }
  
  if (trimmed.startsWith('-')) {
    const method = trimmed.slice(1) as 'ascii' | 'size';
    return { method: method === 'ascii' || method === 'size' ? method : 'ascii', ascending: false };
  }
  
  const method = trimmed as 'ascii' | 'size';
  return { method: method === 'ascii' || method === 'size' ? method : 'ascii', ascending: true };
}

export function statCommand(options: { width?: string; sortBy?: string; historyOrder?: string; current?: boolean; fullMessage?: boolean }) {
  const width = parseInt(options.width || '80', 10);
  const { method, ascending } = parseSortBy(options.sortBy || 'ascii');
  const historyOrder = options.historyOrder || 'reverse';
  
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
    let projectEntries = Object.entries(data.projects);
    
    // Filter for current project if --current flag is set
    if (options.current) {
      const currentDir = getCurrentDirectory();
      projectEntries = projectEntries.filter(([projectPath]) => projectPath === currentDir);
    }
    
    const projects: ProcessedProject[] = projectEntries
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
      .sort((a, b) => {
        if (method === 'size') {
          return ascending ? a.totalSize - b.totalSize : b.totalSize - a.totalSize;
        } else {
          return ascending ? a.path.localeCompare(b.path) : b.path.localeCompare(a.path);
        }
      });
    
    // Display results with clean professional styling
    projects.forEach((project, projectIndex) => {
      // Clean separator
      console.log('─'.repeat(width));
      
      // Project header with sequential numbering
      const projectNumber = lpad((projectIndex + 1).toString(), 2, '0');
      console.log(chalk.bold.cyan(`Project ${projectNumber}: ${project.path}`));
      
      // Size display with clean formatting
      const sizeKB = (project.totalSize / 1024).toFixed(2);
      const sizeMB = (project.totalSize / (1024 * 1024)).toFixed(2);
      const sizeDisplay = project.totalSize > 1024 * 1024 
        ? `${sizeMB} MB` 
        : project.totalSize > 1024 
          ? `${sizeKB} KB` 
          : `${project.totalSize} bytes`;
      
      // Simple progress indicator using dots
      const maxSize = Math.max(...projects.map(p => p.totalSize));
      const sizeRatio = project.totalSize / maxSize;
      const barLength = 20;
      const filledLength = Math.floor(barLength * sizeRatio);
      const sizeBar = '▓'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
      
      console.log(chalk.white(`  TOTAL SIZE: ${chalk.bold(sizeDisplay)}`));
      console.log(chalk.white(`  History Details (${chalk.bold(project.historyItems.length)} entries):`));
      console.log();

      // Clean history items without indicators
      const orderedHistoryItems = historyOrder === 'reverse' 
        ? [...project.historyItems].reverse() 
        : project.historyItems;
      
      orderedHistoryItems.forEach((item, index) => {
        const lineNumber = lpad((index + 1).toString(), 2, '0');
        
        if (options.fullMessage) {
          // Show full message without truncation
          const content = item.display.replace(/\n/g, ' ');
          console.log(`  ${lineNumber}. ${content}`);
        } else {
          // Show truncated message (existing behavior)
          const content = item.display
            .replace(/\n/g, ' ')
            .substring(0, width > 6 ? width - 6 : width);
          const truncated = item.display.replace(/\n/g, ' ').length > width - 6 ? chalk.dim('...') : '';
          
          console.log(`  ${lineNumber}. ${content}${truncated}`);
        }
      });
      
      console.log();
    });
    
  } catch (error) {
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}