import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import Database from 'better-sqlite3';

interface ClaudeSettings {
  hooks?: {
    PostToolUse?: Array<{
      matcher: string;
      hooks: Array<{
        type: string;
        command: string;
        timeout?: number;
      }>;
    }>;
  };
  [key: string]: any;
}

const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');
const DB_PATH = path.join(os.homedir(), '.claude', 'db.sql');

function ensureClaudeDirectory(): void {
  const claudeDir = path.join(os.homedir(), '.claude');
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
    console.log(chalk.green('✅ Created ~/.claude directory'));
  }
}

function initDatabase(): void {
  console.log(chalk.blue('🔄 Initializing SQLite database...'));
  
  const db = new Database(DB_PATH);
  
  // Create executions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS executions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      timestamp DATETIME NOT NULL,
      tool_name TEXT NOT NULL,
      tool_input TEXT,
      tool_response TEXT,
      project_path TEXT,
      duration_ms INTEGER,
      success BOOLEAN,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create indexes for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_executions_session 
    ON executions(session_id)
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_executions_timestamp 
    ON executions(timestamp)
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_executions_tool 
    ON executions(tool_name)
  `);
  
  db.close();
  console.log(chalk.green('✅ Database initialized at ~/.claude/db.sql'));
}

function setupHooks(): void {
  console.log(chalk.blue('🔄 Setting up Claude Code hooks...'));
  
  let settings: ClaudeSettings = {};
  
  // Read existing settings if they exist
  if (fs.existsSync(CLAUDE_SETTINGS_PATH)) {
    try {
      const settingsContent = fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf8');
      settings = JSON.parse(settingsContent);
      console.log(chalk.yellow('📄 Found existing settings file'));
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not parse existing settings, creating new one'));
      settings = {};
    }
  }
  
  // Initialize hooks structure if it doesn't exist
  if (!settings.hooks) {
    settings.hooks = {};
  }
  if (!settings.hooks.PostToolUse) {
    settings.hooks.PostToolUse = [];
  }
  
  // Check if our tracking hook already exists
  const existingHook = settings.hooks.PostToolUse.find(hook => 
    hook.hooks?.some(h => h.command === 'npx ccm track')
  );
  
  if (existingHook) {
    console.log(chalk.yellow('⚠️  Tracking hook already configured'));
    return;
  }
  
  // Add our tracking hook
  settings.hooks.PostToolUse.push({
    matcher: '',
    hooks: [
      {
        type: 'command',
        command: 'npx ccm track',
        timeout: 5
      }
    ]
  });
  
  // Write updated settings
  try {
    fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2));
    console.log(chalk.green('✅ Added tracking hook to Claude Code settings'));
    console.log(chalk.gray(`    Location: ${CLAUDE_SETTINGS_PATH}`));
  } catch (error) {
    console.error(chalk.red(`❌ Failed to write settings: ${error}`));
    throw error;
  }
}

function checkSetup(): { database: boolean; hooks: boolean } {
  const databaseExists = fs.existsSync(DB_PATH);
  
  let hooksConfigured = false;
  if (fs.existsSync(CLAUDE_SETTINGS_PATH)) {
    try {
      const settings = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf8'));
      hooksConfigured = settings.hooks?.PostToolUse?.some((hook: any) =>
        hook.hooks?.some((h: any) => h.command === 'npx ccm track')
      ) || false;
    } catch {
      hooksConfigured = false;
    }
  }
  
  return { database: databaseExists, hooks: hooksConfigured };
}

export async function initCommand(options: { force?: boolean; check?: boolean }): Promise<void> {
  try {
    if (options.check) {
      console.log(chalk.cyan('🔍 Checking setup status...\n'));
      
      const status = checkSetup();
      
      console.log(`${status.database ? '✅' : '❌'} Database: ${status.database ? 'Initialized' : 'Not found'}`);
      console.log(`${status.hooks ? '✅' : '❌'} Hooks: ${status.hooks ? 'Configured' : 'Not configured'}`);
      
      if (status.database && status.hooks) {
        console.log(chalk.green('\n🎉 Claude Code tracking is fully set up!'));
        console.log(chalk.gray('   Use Claude Code normally and check analytics with: ccm stat --analyzer'));
      } else {
        console.log(chalk.yellow('\n⚠️  Setup incomplete. Run: ccm init'));
      }
      return;
    }
    
    console.log(chalk.cyan('🚀 Initializing Claude Code tracking...\n'));
    
    // Check current setup
    const currentStatus = checkSetup();
    
    if (currentStatus.database && currentStatus.hooks && !options.force) {
      console.log(chalk.green('✅ Tracking is already set up!'));
      console.log(chalk.gray('   Use --force to reinitialize or --check to verify status'));
      return;
    }
    
    // Ensure .claude directory exists
    ensureClaudeDirectory();
    
    // Initialize database
    initDatabase();
    
    // Setup hooks
    setupHooks();
    
    console.log(chalk.green('\n🎉 Claude Code tracking initialized successfully!'));
    console.log(chalk.cyan('\n📋 Next steps:'));
    console.log(chalk.gray('   1. Use Claude Code normally'));
    console.log(chalk.gray('   2. Tool executions will be automatically tracked'));
    console.log(chalk.gray('   3. View analytics with: ccm stat --analyzer'));
    console.log(chalk.gray('   4. Check timeline in the analyzer for execution patterns'));
    
  } catch (error) {
    console.error(chalk.red(`❌ Initialization failed: ${error}`));
    process.exit(1);
  }
}