import fs from 'fs';
import path from 'path';
import os from 'os';
import Database from 'better-sqlite3';

interface ExecutionData {
  session_id: string;
  tool_name: string;
  tool_input?: any;
  tool_response?: any;
  transcript_path?: string;
}

const DB_PATH = path.join(os.homedir(), '.claude', 'db.sql');
const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

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

function ensureAutoSetup(): void {
  try {
    // Ensure .claude directory exists
    const claudeDir = path.dirname(DB_PATH);
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true });
    }

    // Auto-configure hooks if not already set up
    setupHooksIfNeeded();
  } catch (error) {
    // Silent fail - don't break tracking if setup fails
    console.error(`Auto-setup warning: ${error}`);
  }
}

function setupHooksIfNeeded(): void {
  let settings: ClaudeSettings = {};
  
  // Read existing settings if they exist
  if (fs.existsSync(CLAUDE_SETTINGS_PATH)) {
    try {
      const settingsContent = fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf8');
      settings = JSON.parse(settingsContent);
    } catch (error) {
      settings = {};
    }
  }
  
  // Check if our tracking hook already exists
  const hooksExist = settings.hooks?.PostToolUse?.some(hook => 
    hook.hooks?.some(h => h.command === 'npx ccm track')
  );
  
  if (hooksExist) {
    return; // Already configured
  }
  
  // Initialize hooks structure if it doesn't exist
  if (!settings.hooks) {
    settings.hooks = {};
  }
  if (!settings.hooks.PostToolUse) {
    settings.hooks.PostToolUse = [];
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
  } catch (error) {
    // Silent fail - hooks will need to be configured manually
  }
}

function initDatabase(): Database.Database {
  // Ensure .claude directory exists
  const claudeDir = path.dirname(DB_PATH);
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }
  
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
  
  return db;
}

function logExecution(db: Database.Database, data: ExecutionData): void {
  // Extract relevant fields
  const { session_id, tool_name, tool_input, tool_response, transcript_path } = data;
  
  // Get project path from transcript path
  let project_path = '';
  if (transcript_path) {
    const parts = transcript_path.split('/');
    if (parts.includes('projects')) {
      const projectIdx = parts.indexOf('projects');
      if (projectIdx + 1 < parts.length) {
        project_path = parts[projectIdx + 1];
      }
    }
  }
  
  // Determine success based on tool_response
  let success = true;
  let error_message: string | null = null;
  if (tool_response && typeof tool_response === 'object') {
    success = tool_response.success !== false;
    error_message = tool_response.error || null;
  }
  
  // Insert execution record
  const stmt = db.prepare(`
    INSERT INTO executions 
    (session_id, timestamp, tool_name, tool_input, tool_response, 
     project_path, success, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run([
    session_id,
    new Date().toISOString(),
    tool_name,
    JSON.stringify(tool_input || {}),
    JSON.stringify(tool_response || {}),
    project_path,
    success ? 1 : 0,
    error_message
  ]);
}

export async function trackCommand(): Promise<void> {
  try {
    // Auto-setup on first run
    ensureAutoSetup();
    
    // Read JSON input from stdin
    const input = await new Promise<string>((resolve, reject) => {
      let data = '';
      process.stdin.setEncoding('utf8');
      
      process.stdin.on('data', (chunk) => {
        data += chunk;
      });
      
      process.stdin.on('end', () => {
        resolve(data);
      });
      
      process.stdin.on('error', reject);
    });
    
    if (!input.trim()) {
      console.error('No input data provided');
      process.exit(1);
    }
    
    const executionData: ExecutionData = JSON.parse(input);
    
    // Initialize database
    const db = initDatabase();
    
    // Log the execution
    logExecution(db, executionData);
    
    // Close database
    db.close();
    
    // Output success message for debugging
    console.log(`Logged execution: ${executionData.tool_name}`);
    
  } catch (error) {
    console.error(`Error logging execution: ${error}`);
    process.exit(1);
  }
}