import { spawn } from 'child_process';
import chalk from 'chalk';

interface UsageOptions {
  since?: string;
  until?: string;
  json?: boolean;
  breakdown?: boolean;
  offline?: boolean;
  live?: boolean;
}

export function usageCommand(subcommand?: string, options: UsageOptions = {}) {
  // 构建 ccusage 命令参数
  const args: string[] = [];
  
  // 添加子命令（如果存在）
  if (subcommand) {
    args.push(subcommand);
  }
  
  // 添加选项
  if (options.since) {
    args.push('--since', options.since);
  }
  if (options.until) {
    args.push('--until', options.until);
  }
  if (options.json) {
    args.push('--json');
  }
  if (options.breakdown) {
    args.push('--breakdown');
  }
  if (options.offline) {
    args.push('--offline');
  }
  if (options.live) {
    args.push('--live');
  }
  
  // 检查 ccusage 是否可用
  const ccusageProcess = spawn('npx', ['ccusage', '--help'], {
    stdio: 'pipe'
  });
  
  ccusageProcess.on('error', (error) => {
    console.error(chalk.red('Error: ccusage not found or not accessible'));
    console.error(chalk.yellow('Please install ccusage first:'));
    console.error(chalk.cyan('  npm install -g ccusage'));
    console.error(chalk.cyan('  # or use it directly:'));
    console.error(chalk.cyan('  npx ccusage'));
    process.exit(1);
  });
  
  ccusageProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(chalk.red('Error: ccusage check failed'));
      process.exit(1);
    }
    
    // 如果 ccusage 可用，执行实际命令
    executeUsageCommand(args);
  });
}

function executeUsageCommand(args: string[]) {
  // 使用 npx 执行 ccusage 命令
  const ccusageProcess = spawn('npx', ['ccusage', ...args], {
    stdio: 'inherit', // 直接继承父进程的输入输出
    shell: true
  });
  
  ccusageProcess.on('error', (error) => {
    console.error(chalk.red(`Error executing ccusage: ${error.message}`));
    process.exit(1);
  });
  
  ccusageProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(chalk.red(`ccusage exited with code ${code}`));
      process.exit(code || 1);
    }
  });
}