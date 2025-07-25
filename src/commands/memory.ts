import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

interface MemoryFile {
  path: string;
  type: 'CLAUDE.md' | 'CLAUDE.local.md';
  source: 'parent' | 'current' | 'subtree' | 'global';
  content: string;
  size: number;
  modified: Date;
}

interface MemoryOptions {
  pathsOnly?: boolean;
  full?: boolean;
  exclude?: string[];
}

function isExcluded(dirPath: string, excludePatterns: string[]): boolean {
  const dirName = path.basename(dirPath);
  return excludePatterns.some(pattern => {
    if (pattern.includes('*')) {
      // Simple glob pattern matching
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(dirName);
    }
    return dirName === pattern;
  });
}

function findParentMemories(startDir: string, excludePatterns: string[]): MemoryFile[] {
  const memories: MemoryFile[] = [];
  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    if (isExcluded(currentDir, excludePatterns)) {
      currentDir = path.dirname(currentDir);
      continue;
    }

    // Check for CLAUDE.md and CLAUDE.local.md
    const memoryFiles = ['CLAUDE.md', 'CLAUDE.local.md'];
    
    for (const fileName of memoryFiles) {
      const filePath = path.join(currentDir, fileName);
      if (fs.existsSync(filePath)) {
        try {
          const stats = fs.statSync(filePath);
          const content = fs.readFileSync(filePath, 'utf8');
          const source = currentDir === startDir ? 'current' : 'parent';
          
          memories.push({
            path: filePath,
            type: fileName as 'CLAUDE.md' | 'CLAUDE.local.md',
            source,
            content,
            size: stats.size,
            modified: stats.mtime
          });
        } catch (error) {
          // Skip files that can't be read
          console.warn(chalk.yellow(`Warning: Could not read ${filePath}`));
        }
      }
    }

    currentDir = path.dirname(currentDir);
  }

  return memories;
}

function findGlobalMemories(): MemoryFile[] {
  const memories: MemoryFile[] = [];
  const claudeConfigDir = path.join(os.homedir(), '.claude');
  
  if (!fs.existsSync(claudeConfigDir)) {
    return memories;
  }

  // Check for CLAUDE.md and CLAUDE.local.md in ~/.claude/
  const memoryFiles = ['CLAUDE.md', 'CLAUDE.local.md'];
  
  for (const fileName of memoryFiles) {
    const filePath = path.join(claudeConfigDir, fileName);
    if (fs.existsSync(filePath)) {
      try {
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        
        memories.push({
          path: filePath,
          type: fileName as 'CLAUDE.md' | 'CLAUDE.local.md',
          source: 'global',
          content,
          size: stats.size,
          modified: stats.mtime
        });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read ${filePath}`));
      }
    }
  }

  return memories;
}

function findSubtreeMemories(startDir: string, excludePatterns: string[]): MemoryFile[] {
  const memories: MemoryFile[] = [];
  const defaultExcludes = ['node_modules', '.git', 'dist', '.next', 'build', 'coverage'];
  const allExcludes = [...defaultExcludes, ...excludePatterns];

  function traverseDirectory(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!isExcluded(fullPath, allExcludes)) {
            traverseDirectory(fullPath);
          }
        } else if (entry.name === 'CLAUDE.md') {
          // Only look for CLAUDE.md in subtrees (not CLAUDE.local.md)
          if (fullPath !== path.join(startDir, 'CLAUDE.md')) {
            try {
              const stats = fs.statSync(fullPath);
              const content = fs.readFileSync(fullPath, 'utf8');
              
              memories.push({
                path: fullPath,
                type: 'CLAUDE.md',
                source: 'subtree',
                content,
                size: stats.size,
                modified: stats.mtime
              });
            } catch (error) {
              console.warn(chalk.yellow(`Warning: Could not read ${fullPath}`));
            }
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }

  traverseDirectory(startDir);
  return memories;
}

function formatMemoryDisplay(memories: MemoryFile[], options: MemoryOptions): string {
  if (memories.length === 0) {
    return chalk.gray('No memory files found.');
  }

  const output: string[] = [];
  
  // Group memories by source
  const globalMemories = memories.filter(m => m.source === 'global');
  const parentMemories = memories.filter(m => m.source === 'parent');
  const currentMemories = memories.filter(m => m.source === 'current');
  const subtreeMemories = memories.filter(m => m.source === 'subtree');

  // Display header
  output.push(chalk.bold.cyan('📚 Claude Code Memories'));
  output.push('');

  // Global memories (from ~/.claude/)
  if (globalMemories.length > 0) {
    output.push(chalk.bold.yellow('🌍 Global Memories (~/.claude/)'));
    globalMemories.forEach(memory => {
      const relativePath = memory.path.replace(os.homedir(), '~');
      const fileName = chalk.cyan(path.basename(memory.path));
      
      if (options.pathsOnly) {
        output.push(`  ${relativePath}`);
      } else {
        output.push(`  📄 ${relativePath} ${chalk.gray(`(${memory.size} bytes, ${memory.modified.toLocaleDateString()})`)}`);
        
        if (options.full) {
          output.push(chalk.dim('    ' + memory.content.replace(/\n/g, '\n    ')));
        } else {
          // Show first few lines as preview
          const preview = memory.content.split('\n').slice(0, 3).join('\n');
          output.push(chalk.dim('    ' + preview.replace(/\n/g, '\n    ')));
          if (memory.content.split('\n').length > 3) {
            output.push(chalk.dim('    ...'));
          }
        }
        output.push('');
      }
    });
  }

  // Parent memories (ancestor directories)
  if (parentMemories.length > 0) {
    output.push(chalk.bold.green('🔼 Parent Directory Memories'));
    parentMemories
      .sort((a, b) => a.path.length - b.path.length) // Sort by depth (closer parents first)
      .forEach(memory => {
        const relativePath = path.relative(process.cwd(), memory.path);
        const dirPath = chalk.dim(path.dirname(relativePath));
        const fileName = chalk.cyan(path.basename(memory.path));
        
        if (options.pathsOnly) {
          output.push(`  ${dirPath}/${fileName}`);
        } else {
          output.push(`  📄 ${dirPath}/${fileName} ${chalk.gray(`(${memory.size} bytes, ${memory.modified.toLocaleDateString()})`)}`);
          
          if (options.full) {
            output.push(chalk.dim('    ' + memory.content.replace(/\n/g, '\n    ')));
          } else {
            // Show first few lines as preview
            const preview = memory.content.split('\n').slice(0, 3).join('\n');
            output.push(chalk.dim('    ' + preview.replace(/\n/g, '\n    ')));
            if (memory.content.split('\n').length > 3) {
              output.push(chalk.dim('    ...'));
            }
          }
          output.push('');
        }
      });
  }

  // Current directory memories
  if (currentMemories.length > 0) {
    output.push(chalk.bold.blue('📍 Current Directory Memories'));
    currentMemories.forEach(memory => {
      const fileName = chalk.cyan(path.basename(memory.path));
      
      if (options.pathsOnly) {
        output.push(`  ${fileName}`);
      } else {
        output.push(`  📄 ${fileName} ${chalk.gray(`(${memory.size} bytes, ${memory.modified.toLocaleDateString()})`)}`);
        
        if (options.full) {
          output.push(chalk.dim('    ' + memory.content.replace(/\n/g, '\n    ')));
        } else {
          const preview = memory.content.split('\n').slice(0, 3).join('\n');
          output.push(chalk.dim('    ' + preview.replace(/\n/g, '\n    ')));
          if (memory.content.split('\n').length > 3) {
            output.push(chalk.dim('    ...'));
          }
        }
        output.push('');
      }
    });
  }

  // Subtree memories
  if (subtreeMemories.length > 0) {
    output.push(chalk.bold.magenta('🔽 Subtree Memories'));
    subtreeMemories
      .sort((a, b) => a.path.localeCompare(b.path))
      .forEach(memory => {
        const relativePath = path.relative(process.cwd(), memory.path);
        const dirPath = chalk.dim(path.dirname(relativePath));
        const fileName = chalk.cyan(path.basename(memory.path));
        
        if (options.pathsOnly) {
          output.push(`  ${relativePath}`);
        } else {
          output.push(`  📄 ${dirPath}/${fileName} ${chalk.gray(`(${memory.size} bytes, ${memory.modified.toLocaleDateString()})`)}`);
          
          if (options.full) {
            output.push(chalk.dim('    ' + memory.content.replace(/\n/g, '\n    ')));
          } else {
            const preview = memory.content.split('\n').slice(0, 3).join('\n');
            output.push(chalk.dim('    ' + preview.replace(/\n/g, '\n    ')));
            if (memory.content.split('\n').length > 3) {
              output.push(chalk.dim('    ...'));
            }
          }
          output.push('');
        }
      });
  }

  // Summary
  if (!options.pathsOnly) {
    output.push(chalk.dim('─'.repeat(50)));
    output.push(chalk.bold(`Total: ${memories.length} memory files found`));
    output.push(chalk.dim(`Global: ${globalMemories.length}, Parent: ${parentMemories.length}, Current: ${currentMemories.length}, Subtree: ${subtreeMemories.length}`));
  }

  return output.join('\n');
}

export async function memoryCommand(options: MemoryOptions): Promise<void> {
  try {
    const startDir = process.cwd();
    const excludePatterns = options.exclude || [];

    console.log(chalk.dim(`Discovering memories from: ${startDir}`));
    console.log('');

    // Find all memories
    const globalMemories = findGlobalMemories();
    const parentMemories = findParentMemories(startDir, excludePatterns);
    const subtreeMemories = findSubtreeMemories(startDir, excludePatterns);
    const allMemories = [...globalMemories, ...parentMemories, ...subtreeMemories];

    // Display results
    const output = formatMemoryDisplay(allMemories, options);
    console.log(output);

  } catch (error) {
    console.error(chalk.red('Error discovering memories:'), error);
    process.exit(1);
  }
}