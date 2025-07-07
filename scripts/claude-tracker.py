#!/usr/bin/env python3
"""
Claude Code execution tracker
Logs tool executions to SQLite database for analysis
"""

import json
import sqlite3
import sys
import os
from datetime import datetime
from pathlib import Path

# Database path
DB_PATH = Path.home() / ".claude" / "db.sql"

def init_database():
    """Initialize SQLite database with tracking schema"""
    # Ensure .claude directory exists
    DB_PATH.parent.mkdir(exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create executions table
    cursor.execute('''
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
    ''')
    
    # Create index for common queries
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_executions_session 
        ON executions(session_id)
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_executions_timestamp 
        ON executions(timestamp)
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_executions_tool 
        ON executions(tool_name)
    ''')
    
    conn.commit()
    conn.close()

def log_execution(data):
    """Log execution data to database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Extract relevant fields
    session_id = data.get('session_id', '')
    tool_name = data.get('tool_name', '')
    tool_input = json.dumps(data.get('tool_input', {}))
    tool_response = json.dumps(data.get('tool_response', {}))
    
    # Get project path from transcript path
    transcript_path = data.get('transcript_path', '')
    project_path = ''
    if transcript_path:
        # Extract project path from transcript path
        parts = transcript_path.split('/')
        if 'projects' in parts:
            project_idx = parts.index('projects')
            if project_idx + 1 < len(parts):
                project_path = parts[project_idx + 1]
    
    # Determine success based on tool_response
    success = True
    error_message = None
    if 'tool_response' in data:
        response = data['tool_response']
        if isinstance(response, dict):
            success = response.get('success', True)
            error_message = response.get('error', None)
    
    # Insert execution record
    cursor.execute('''
        INSERT INTO executions 
        (session_id, timestamp, tool_name, tool_input, tool_response, 
         project_path, success, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        session_id,
        datetime.now().isoformat(),
        tool_name,
        tool_input,
        tool_response,
        project_path,
        success,
        error_message
    ))
    
    conn.commit()
    conn.close()

def main():
    """Main execution function"""
    try:
        # Initialize database
        init_database()
        
        # Read JSON input from stdin
        input_data = json.load(sys.stdin)
        
        # Log the execution
        log_execution(input_data)
        
        # Output success message for debugging
        print(f"Logged execution: {input_data.get('tool_name', 'unknown')}")
        
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON input: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error logging execution: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()