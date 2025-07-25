import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

interface UsageDay {
  date: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  totalCost: number;
  modelsUsed: string[];
  modelBreakdowns: Array<{
    modelName: string;
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    cost: number;
  }>;
}

interface UsageData {
  daily: UsageDay[];
  totals: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    totalCost: number;
    totalTokens: number;
  };
}

interface ProcessedUsageData {
  daily: UsageDay[];
  totals: UsageData['totals'];
  metadata: {
    generatedAt: string;
    totalDays: number;
    dateRange: {
      start: string;
      end: string;
    };
    averageDaily: {
      cost: number;
      tokens: number;
      inputTokens: number;
      outputTokens: number;
    };
    peakUsage: {
      date: string;
      cost: number;
      tokens: number;
    };
    models: string[];
  };
}

function findUsageDataFile(): string | null {
  const currentDir = process.cwd();
  const usageFilePath = path.join(currentDir, '.data', 'usage.json');
  
  if (fs.existsSync(usageFilePath)) {
    return usageFilePath;
  }
  
  return null;
}

function processUsageData(rawData: UsageData): ProcessedUsageData {
  const sortedDaily = [...rawData.daily].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Calculate metadata
  const totalDays = sortedDaily.length;
  const dateRange = {
    start: sortedDaily[0]?.date || '',
    end: sortedDaily[sortedDaily.length - 1]?.date || ''
  };
  
  const averageDaily = {
    cost: totalDays > 0 ? rawData.totals.totalCost / totalDays : 0,
    tokens: totalDays > 0 ? rawData.totals.totalTokens / totalDays : 0,
    inputTokens: totalDays > 0 ? rawData.totals.inputTokens / totalDays : 0,
    outputTokens: totalDays > 0 ? rawData.totals.outputTokens / totalDays : 0
  };
  
  // Find peak usage day
  const peakDay = sortedDaily.reduce((peak, day) => 
    day.totalCost > peak.totalCost ? day : peak, 
    sortedDaily[0] || { date: '', totalCost: 0, totalTokens: 0 }
  );
  
  const peakUsage = {
    date: peakDay.date,
    cost: peakDay.totalCost,
    tokens: peakDay.totalTokens
  };
  
  // Extract unique models
  const models = [...new Set(sortedDaily.flatMap(day => day.modelsUsed))];
  
  return {
    daily: sortedDaily,
    totals: rawData.totals,
    metadata: {
      generatedAt: new Date().toISOString(),
      totalDays,
      dateRange,
      averageDaily,
      peakUsage,
      models
    }
  };
}

async function generateDashboard(data: ProcessedUsageData): Promise<void> {
  // Read the HTML template
  const templatePath = path.join(__dirname, '../templates/dashboard.html');
  let template: string;
  
  try {
    template = fs.readFileSync(templatePath, 'utf8');
  } catch (error) {
    console.error(chalk.red('Error: Could not find dashboard template'));
    console.error(chalk.yellow('Make sure the template exists at: src/templates/dashboard.html'));
    process.exit(1);
  }

  // Replace the data placeholder with actual data
  const htmlContent = template.replace('/*DATA_PLACEHOLDER*/', JSON.stringify(data));

  // Generate output file path
  const outputDir = os.tmpdir();
  const outputFile = path.join(outputDir, `claude-usage-dashboard-${Date.now()}.html`);

  try {
    // Write the HTML file
    fs.writeFileSync(outputFile, htmlContent);
    
    console.log(chalk.green('🎉 Claude Usage Dashboard generated!'));
    console.log(chalk.blue(`📄 Report saved to: ${outputFile}`));
    console.log(chalk.yellow('🌐 Opening in browser...'));

    // Open the file in browser using system commands
    try {
      console.log(chalk.blue('🔄 Attempting to open browser...'));
      
      const { spawn } = await import('child_process');
      
      const commands = [
        ['open', outputFile], // macOS
        ['xdg-open', outputFile], // Linux  
        ['start', '', outputFile], // Windows (empty string for start command)
      ];

      let opened = false;
      for (const [cmd, ...args] of commands) {
        try {
          console.log(chalk.gray(`   Trying: ${cmd} ${args.join(' ')}`));
          
          const child = spawn(cmd, args.filter(arg => arg !== ''), { 
            stdio: 'ignore', 
            detached: true,
            shell: process.platform === 'win32' // Use shell on Windows
          });
          
          // Give the command a moment to start
          await new Promise(resolve => setTimeout(resolve, 100));
          
          if (child.unref) {
            child.unref();
          }
          
          console.log(chalk.green(`✅ Browser opened with ${cmd}`));
          opened = true;
          break;
        } catch (err: any) {
          console.log(chalk.gray(`   ${cmd} failed: ${err?.message || err}`));
          continue;
        }
      }

      if (!opened) {
        // Try exec as last resort
        console.log(chalk.blue('🔄 Trying exec commands...'));
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        const execCommands = [
          `open "${outputFile}"`, // macOS
          `xdg-open "${outputFile}"`, // Linux
          `start "" "${outputFile}"`, // Windows
        ];

        for (const cmd of execCommands) {
          try {
            console.log(chalk.gray(`   Trying exec: ${cmd}`));
            await execAsync(cmd);
            console.log(chalk.green(`✅ Browser opened with exec: ${cmd}`));
            opened = true;
            break;
          } catch (err: any) {
            console.log(chalk.gray(`   exec failed: ${err?.message || err}`));
            continue;
          }
        }
      }

      if (!opened) {
        throw new Error('All browser opening strategies failed');
      }

    } catch (error: any) {
      console.log(chalk.red(`❌ Failed to open browser: ${error?.message || error}`));
      console.log(chalk.yellow(`💡 Please manually open this file in your browser:`));
      console.log(chalk.cyan(`   ${outputFile}`));
    }

    console.log(chalk.cyan('🔍 Dashboard is ready! Press Ctrl+C to exit'));
    
    // Setup cleanup function
    const cleanup = () => {
      console.log(chalk.yellow('\n🧹 Cleaning up...'));
      
      // Remove the temporary file
      try {
        fs.unlinkSync(outputFile);
        console.log(chalk.green('✅ Temporary file cleaned up'));
      } catch (error) {
        // File might already be deleted, ignore error
      }
      
      console.log(chalk.green('👋 Dashboard closed'));
      process.exit(0);
    };

    // Handle Ctrl+C gracefully
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Keep the process running
    await new Promise(() => {}); // This will run indefinitely until interrupted

  } catch (error) {
    console.error(chalk.red(`Error writing dashboard file: ${error}`));
    process.exit(1);
  }
}

export async function dashboardCommand(options: { export?: string; format?: string }) {
  try {
    // Find usage data file
    const usageFilePath = findUsageDataFile();
    if (!usageFilePath) {
      console.error(chalk.red('Error: Could not find usage data file'));
      console.error(chalk.yellow('Expected location: .data/usage.json'));
      console.error(chalk.yellow('Make sure you have generated usage data first'));
      process.exit(1);
    }
    
    // Read and parse usage data
    const rawData = fs.readFileSync(usageFilePath, 'utf8');
    const usageData: UsageData = JSON.parse(rawData);
    
    if (!usageData.daily || usageData.daily.length === 0) {
      console.error(chalk.red('Error: No usage data found'));
      console.error(chalk.yellow('The usage.json file appears to be empty or invalid'));
      process.exit(1);
    }
    
    // Process the data
    const processedData = processUsageData(usageData);
    
    // Handle export option
    if (options.export) {
      const exportFormat = options.format || 'json';
      
      if (!['json', 'csv'].includes(exportFormat)) {
        console.error(chalk.red(`❌ Invalid export format: ${exportFormat}. Supported formats: json, csv`));
        process.exit(1);
      }
      
      try {
        const exportContent = exportFormat === 'json' 
          ? JSON.stringify(processedData, null, 2)
          : generateCSVExport(processedData);
        
        fs.writeFileSync(options.export, exportContent, 'utf8');
        console.log(chalk.green(`✅ Data exported to: ${options.export}`));
        console.log(chalk.blue(`📊 Format: ${exportFormat.toUpperCase()}`));
        console.log(chalk.blue(`📅 Date range: ${processedData.metadata.dateRange.start} to ${processedData.metadata.dateRange.end}`));
        console.log(chalk.blue(`💰 Total cost: $${processedData.totals.totalCost.toFixed(2)}`));
        return;
      } catch (error) {
        console.error(chalk.red(`❌ Failed to export data: ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
      }
    }
    
    // Show summary info
    console.log(chalk.cyan('📊 Claude Usage Dashboard'));
    console.log(chalk.white(`📅 Date range: ${chalk.bold(processedData.metadata.dateRange.start)} to ${chalk.bold(processedData.metadata.dateRange.end)}`));
    console.log(chalk.white(`📈 Total days: ${chalk.bold(processedData.metadata.totalDays)}`));
    console.log(chalk.white(`💰 Total cost: ${chalk.bold('$' + processedData.totals.totalCost.toFixed(2))}`));
    console.log(chalk.white(`🎯 Peak usage: ${chalk.bold('$' + processedData.metadata.peakUsage.cost.toFixed(2))} on ${processedData.metadata.peakUsage.date}`));
    console.log(chalk.white(`🤖 Models used: ${chalk.bold(processedData.metadata.models.join(', '))}`));
    console.log();
    
    // Generate and open dashboard
    await generateDashboard(processedData);
    
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(chalk.red('Error: Invalid JSON in usage data file'));
      console.error(chalk.yellow('Please check the format of .data/usage.json'));
    } else {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    }
    process.exit(1);
  }
}

function generateCSVExport(data: ProcessedUsageData): string {
  const headers = [
    'Date',
    'Input Tokens',
    'Output Tokens', 
    'Cache Creation Tokens',
    'Cache Read Tokens',
    'Total Tokens',
    'Total Cost',
    'Models Used'
  ];
  
  const csvLines = [headers.join(',')];
  
  data.daily.forEach(day => {
    const row = [
      day.date,
      day.inputTokens.toString(),
      day.outputTokens.toString(),
      day.cacheCreationTokens.toString(),
      day.cacheReadTokens.toString(),
      day.totalTokens.toString(),
      day.totalCost.toFixed(6),
      `"${day.modelsUsed.join(', ')}"`
    ];
    csvLines.push(row.join(','));
  });
  
  return csvLines.join('\n');
}