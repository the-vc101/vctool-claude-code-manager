import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import * as blessed from 'blessed';
import { exec } from 'child_process';
import { promisify } from 'util';
import Database from 'better-sqlite3';

const execAsync = promisify(exec);

interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  id: string;
}

interface SessionData {
  sessionId: string;
  agentId: string;
  todos: TodoItem[];
  lastModified: Date;
  filePath: string;
  projectPath?: string;
}

interface ProjectInfo {
  projectPath: string;
  projectName: string;
  sessions: Map<string, SessionData[]>;
}

interface TreeNode {
  id: string;
  type: 'project' | 'session' | 'agent' | 'task';
  label: string;
  level: number;
  expanded: boolean;
  data?: any;
  children?: TreeNode[];
  parent?: TreeNode;
}

interface ExecutionData {
  sessionId: string;
  timestamp: string;
  toolName: string;
  toolInput: string;
  toolResponse: string;
  projectPath: string;
  success: boolean;
  errorMessage: string;
  createdAt: string;
}

class CCTaskMonitor {
  private screen: any;
  private tasksBox: any;
  private headerBox: any;
  private footerBox: any;
  private sessionData: Map<string, SessionData> = new Map();
  private projectsData: Map<string, ProjectInfo> = new Map();
  private treeRoot: TreeNode | null = null;
  private flattenedTree: TreeNode[] = [];
  private selectedIndex = 0;
  private watcherActive = false;
  private refreshInterval: NodeJS.Timeout | null = null;
  private currentFilter = 'active_only';
  private sortBy = 'modified';
  private displayMode = 'flat';
  private reverseSort = false;
  private projectFilter: string | null = null;
  private refreshIntervalMs = 2000;
  private activeThreshold = 'recent'; // recent, today, week, all
  private todoPath: string;
  private dbPath: string;
  private db: Database.Database | null = null;
  private lastDisplayedLines = 0; // Track last displayed line count
  private tasksBoxConfig: any; // Store original tasksBox configuration
  private helpVisible = false; // Track help popup visibility
  private detailPopupVisible = false; // Track detail popup visibility
  private currentDetailPopup: any = null; // Reference to current detail popup

  constructor(options: MonitorOptions = {}) {
    this.todoPath = path.join(os.homedir(), '.claude', 'todos');
    this.dbPath = path.join(os.homedir(), '.claude', 'db.sql');
    
    // Apply options
    if (options.displayMode) this.displayMode = options.displayMode;
    if (options.order) this.sortBy = options.order;
    if (options.filter) {
      // Map CLI 'active' to internal 'active_only'
      this.currentFilter = options.filter === 'active' ? 'active_only' : options.filter;
    }
    if (options.project) this.projectFilter = options.project;
    if (options.reverse) this.reverseSort = true;
    if (options.refreshInterval) {
      this.refreshIntervalMs = parseInt(options.refreshInterval) * 1000;
    }
    
    this.screen = blessed.screen({
      smartCSR: false, // Keep disabled for stability
      title: 'Claude Code Task Monitor', 
      dockBorders: true,
      fullUnicode: true, // Re-enable unicode but with careful handling
      fastCSR: false,
    });

    this.initializeUI();
    this.bindEvents();
  }

  private initializeUI() {
    // Header box
    this.headerBox = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 4,
      border: { type: 'line' },
      style: {
        fg: 'white',
        bg: 'black',
        border: { fg: 'cyan' }
      },
      tags: true,
      content: this.getHeaderContent()
    });

    // Main tasks tree - store config for potential rebuilding
    this.tasksBoxConfig = {
      parent: this.screen,
      top: 4,
      left: 0,
      width: '100%',
      height: '100%-7',
      border: { type: 'line' },
      style: {
        fg: 'white',
        bg: 'black',
        border: { fg: 'cyan' },
        selected: { bg: 'blue', fg: 'white' },
        item: { fg: 'white' }
      },
      tags: true,
      keys: true,
      mouse: true,
      scrollable: true,
      alwaysScroll: true,
      items: []
    };
    
    this.tasksBox = blessed.list(this.tasksBoxConfig);

    // Footer box
    this.footerBox = blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 3,
      border: { type: 'line' },
      style: {
        fg: 'white',
        bg: 'black',
        border: { fg: 'cyan' }
      },
      tags: true,
      content: '{center}[Tab]Filter [A]Threshold [D]Display [S]Sort [V]Reverse [P]Project [C]Clear [+/-]Speed [F1]Help [Q]Quit{/center}'
    });
  }

  private getHeaderContent(): string {
    const stats = this.getTaskStats();
    const activeCount = stats.active;
    const pendingCount = stats.pending;
    const inProgressCount = stats.inProgress;
    const completedCount = stats.completed;
    const projectCount = this.projectsData.size;
    const sessionCount = Array.from(this.projectsData.values())
      .reduce((sum, project) => sum + project.sessions.size, 0);
    
    const filterDisplay = this.getFilterDisplay();
    const displayMode = this.displayMode.toUpperCase();
    const sortBy = this.sortBy.toUpperCase() + (this.reverseSort ? ' ↓' : ' ↑');
    const refreshInterval = `${this.refreshIntervalMs / 1000}s`;
    
    // Right-aligned status info
    const statusInfo = `Mode: ${displayMode} | Sort: ${sortBy} | ${refreshInterval} | [{green-fg}●{/green-fg}] Live`;
    
    return `{bold}Claude Code Task Monitor{/bold}
Tasks: {yellow-fg}${pendingCount}{/yellow-fg} PEND | {blue-fg}${inProgressCount}{/blue-fg} PROG | {green-fg}${completedCount}{/green-fg} DONE | Total: {bold}${activeCount}{/bold} ACTIVE
Projects: {bold}${projectCount}{/bold} | Sessions: {bold}${sessionCount}{/bold} | Filter: ${filterDisplay} | ${statusInfo}`;
  }

  private getFilterDisplay(): string {
    switch (this.currentFilter) {
      case 'all': return '{white-fg}ALL{/white-fg}';
      case 'pending': return '{yellow-fg}PEND{/yellow-fg}';
      case 'in_progress': return '{blue-fg}PROG{/blue-fg}';
      case 'completed': return '{green-fg}DONE{/green-fg}';
      case 'active_only': return `{cyan-fg}ACTIVE-${this.activeThreshold.toUpperCase()}{/cyan-fg}`;
      default: return this.currentFilter.toUpperCase();
    }
  }

  private getTaskStats() {
    let pending = 0, inProgress = 0, completed = 0;
    
    this.sessionData.forEach(session => {
      session.todos.forEach(todo => {
        switch (todo.status) {
          case 'pending': pending++; break;
          case 'in_progress': inProgress++; break;
          case 'completed': completed++; break;
        }
      });
    });

    return {
      active: pending + inProgress,
      pending,
      inProgress,
      completed
    };
  }

  private bindEvents() {
    this.screen.key(['escape', 'q', 'C-c'], () => {
      // If help is visible, close help instead of exiting
      if (this.helpVisible) {
        this.hideHelp();
        return;
      }
      // If detail popup is visible, close it instead of exiting
      if (this.detailPopupVisible) {
        this.hideDetailPopup();
        return;
      }
      this.cleanup();
      process.exit(0);
    });

    this.screen.key(['r'], () => {
      this.refreshData();
    });

    this.screen.key(['tab'], () => {
      this.cycleFilter();
    });

    this.screen.key(['s'], () => {
      this.cycleSortBy();
    });

    this.screen.key(['enter'], () => {
      this.showTaskDetails();
    });

    this.screen.key(['space'], () => {
      this.toggleExpanded();
    });

    this.screen.key(['f1'], () => {
      this.toggleHelp();
    });

    this.screen.key(['f10'], () => {
      this.cleanup();
      process.exit(0);
    });

    this.screen.key(['a'], () => {
      this.cycleActiveThreshold();
    });

    // Display mode cycling
    this.screen.key(['d'], () => {
      this.cycleDisplayMode();
    });

    // Reverse sort toggle
    this.screen.key(['v'], () => {
      this.reverseSort = !this.reverseSort;
      this.refreshData();
    });

    // Clear project filter
    this.screen.key(['c'], () => {
      this.projectFilter = null;
      this.refreshData();
    });

    // Set project filter (prompt for input)
    this.screen.key(['p'], () => {
      this.promptProjectFilter();
    });

    // Increase refresh interval
    this.screen.key(['+'], () => {
      this.refreshIntervalMs = Math.min(this.refreshIntervalMs + 1000, 30000);
      this.restartRefreshTimer();
      this.updateHeader();
      this.screen.render();
    });

    // Decrease refresh interval
    this.screen.key(['-'], () => {
      this.refreshIntervalMs = Math.max(this.refreshIntervalMs - 1000, 1000);
      this.restartRefreshTimer();
      this.updateHeader();
      this.screen.render();
    });
  }

  private async initializeDatabase() {
    try {
      if (fs.existsSync(this.dbPath)) {
        this.db = new Database(this.dbPath, { readonly: true });
      }
    } catch (error) {
      console.error('Warning: Could not access Claude execution database');
    }
  }

  private async loadSessionData() {
    try {
      if (!fs.existsSync(this.todoPath)) {
        return;
      }

      const files = fs.readdirSync(this.todoPath);
      const todoFiles = files.filter(file => file.endsWith('.json'));

      this.sessionData.clear();
      this.projectsData.clear();

      for (const file of todoFiles) {
        const filePath = path.join(this.todoPath, file);
        const stats = fs.statSync(filePath);
        
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const todos: TodoItem[] = JSON.parse(content);
          
          const [sessionId, agentPart] = file.replace('.json', '').split('-agent-');
          const agentId = agentPart || sessionId;

          // Try to find project path from ~/.claude/projects/
          const projectPath = this.findProjectPath(sessionId) || undefined;

          const sessionData: SessionData = {
            sessionId,
            agentId,
            todos,
            lastModified: stats.mtime,
            filePath,
            projectPath
          };

          this.sessionData.set(`${sessionId}-${agentId}`, sessionData);

          // Group by project
          if (projectPath) {
            if (!this.projectsData.has(projectPath)) {
              this.projectsData.set(projectPath, {
                projectPath,
                projectName: this.getProjectName(projectPath),
                sessions: new Map()
              });
            }
            
            const projectInfo = this.projectsData.get(projectPath)!;
            if (!projectInfo.sessions.has(sessionId)) {
              projectInfo.sessions.set(sessionId, []);
            }
            projectInfo.sessions.get(sessionId)!.push(sessionData);
          }
        } catch (error) {
          // Skip malformed files
        }
      }
    } catch (error) {
      console.error('Error loading session data:', error);
    }
  }

  private findProjectPath(sessionId: string): string | null {
    try {
      const projectsPath = path.join(os.homedir(), '.claude', 'projects');
      if (!fs.existsSync(projectsPath)) return null;

      const projectDirs = fs.readdirSync(projectsPath);
      for (const projectDir of projectDirs) {
        const projectPath = path.join(projectsPath, projectDir);
        if (fs.statSync(projectPath).isDirectory()) {
          const files = fs.readdirSync(projectPath);
          if (files.some(file => file.startsWith(sessionId))) {
            return this.decodeProjectPath(projectDir);
          }
        }
      }
    } catch (error) {
      // Ignore errors
    }
    return null;
  }

  private decodeProjectPath(encodedPath: string): string {
    // Decode the project path from encoded format
    // e.g., "-Users-mark-projects-claude-code-manager" -> "/Users/mark/projects/claude-code-manager"
    return encodedPath.replace(/^-/, '').replace(/-/g, '/');
  }

  private getProjectName(projectPath: string): string {
    return path.basename(projectPath);
  }

  private refreshData() {
    this.loadSessionData();
    this.buildTreeStructure();
    this.updateTasksTree();
    this.updateHeader();
    this.screen.render();
    
    // Update line count after refreshing
    this.lastDisplayedLines = this.flattenedTree.length;
  }

  private buildTreeStructure() {
    // Build tree structure: Project -> Session -> Agent -> Task
    this.treeRoot = {
      id: 'root',
      type: 'project',
      label: 'All Projects',
      level: 0,
      expanded: true,
      children: []
    };

    // Add projects
    for (const [projectPath, projectInfo] of this.projectsData) {
      // Apply project filter if specified
      if (this.projectFilter && !projectPath.includes(this.projectFilter)) {
        continue;
      }
      const projectNode: TreeNode = {
        id: projectPath,
        type: 'project',
        label: `📁 ${projectInfo.projectPath}`,
        level: 1,
        expanded: true,
        children: [],
        parent: this.treeRoot,
        data: projectInfo
      };

      // Add sessions under each project
      for (const [sessionId, sessions] of projectInfo.sessions) {
        const sessionNode: TreeNode = {
          id: `${projectPath}-${sessionId}`,
          type: 'session',
          label: `💬 Session: ${sessionId.substring(0, 8)}... (${sessions.length} agents)`,
          level: 2,
          expanded: true,
          children: [],
          parent: projectNode,
          data: { sessionId, sessions }
        };

        // Add agents under each session
        for (const session of sessions) {
          const agentDisplayName = session.agentId === sessionId ? 'Main' : session.agentId.substring(0, 8) + '...';
          const taskCount = session.todos.length;
          const activeTaskCount = session.todos.filter(todo => todo.status === 'pending' || todo.status === 'in_progress').length;
          
          const agentNode: TreeNode = {
            id: `${projectPath}-${sessionId}-${session.agentId}`,
            type: 'agent',
            label: `🤖 Agent: ${agentDisplayName.padEnd(12)} (${activeTaskCount}/${taskCount} tasks)`,
            level: 3,
            expanded: true,
            children: [],
            parent: sessionNode,
            data: session
          };

          // Add tasks under each agent
          session.todos.forEach((todo, index) => {
            // Apply filter
            if (this.currentFilter !== 'all' && this.currentFilter !== 'active_only' && todo.status !== this.currentFilter) {
              return;
            }
            
            // For active_only filter, only show pending and in_progress tasks
            if (this.currentFilter === 'active_only' && todo.status !== 'pending' && todo.status !== 'in_progress') {
              return;
            }

            // Apply active threshold filter when using active_only
            if (this.currentFilter === 'active_only' && !this.isWithinActiveThreshold(session.lastModified)) {
              return;
            }

            const taskNode: TreeNode = {
              id: `${projectPath}-${sessionId}-${session.agentId}-${todo.id}`,
              type: 'task',
              label: this.formatTaskLabel(todo, session),
              level: 4,
              expanded: false,
              parent: agentNode,
              data: { session, todo }
            };

            agentNode.children!.push(taskNode);
          });

          if (agentNode.children!.length > 0) {
            sessionNode.children!.push(agentNode);
          }
        }

        if (sessionNode.children!.length > 0) {
          projectNode.children!.push(sessionNode);
        }
      }

      if (projectNode.children!.length > 0) {
        this.treeRoot.children!.push(projectNode);
      }
    }

    // Add sessions without project info (orphaned sessions)
    const orphanedSessions = Array.from(this.sessionData.values())
      .filter(session => !session.projectPath);
    
    if (orphanedSessions.length > 0) {
      const orphanedNode: TreeNode = {
        id: 'orphaned',
        type: 'project',
        label: '📂 Unknown Projects',
        level: 1,
        expanded: true,
        children: [],
        parent: this.treeRoot
      };

      // Group orphaned sessions by sessionId
      const orphanedSessionGroups = new Map<string, SessionData[]>();
      for (const session of orphanedSessions) {
        if (!orphanedSessionGroups.has(session.sessionId)) {
          orphanedSessionGroups.set(session.sessionId, []);
        }
        orphanedSessionGroups.get(session.sessionId)!.push(session);
      }

      for (const [sessionId, sessions] of orphanedSessionGroups) {
        const sessionNode: TreeNode = {
          id: `orphaned-${sessionId}`,
          type: 'session',
          label: `💬 Session: ${sessionId.substring(0, 8)}... (${sessions.length} agents)`,
          level: 2,
          expanded: true,
          children: [],
          parent: orphanedNode,
          data: { sessionId, sessions }
        };

        // Add agents and tasks
        for (const session of sessions) {
          const agentDisplayName = session.agentId === sessionId ? 'Main' : session.agentId.substring(0, 8) + '...';
          const taskCount = session.todos.length;
          const activeTaskCount = session.todos.filter(todo => todo.status === 'pending' || todo.status === 'in_progress').length;
          
          const agentNode: TreeNode = {
            id: `orphaned-${sessionId}-${session.agentId}`,
            type: 'agent',
            label: `🤖 Agent: ${agentDisplayName.padEnd(12)} (${activeTaskCount}/${taskCount} tasks)`,
            level: 3,
            expanded: true,
            children: [],
            parent: sessionNode,
            data: session
          };

          // Add tasks under each agent
          session.todos.forEach((todo, index) => {
            // Apply filter
            if (this.currentFilter !== 'all' && this.currentFilter !== 'active_only' && todo.status !== this.currentFilter) {
              return;
            }
            
            // For active_only filter, only show pending and in_progress tasks
            if (this.currentFilter === 'active_only' && todo.status !== 'pending' && todo.status !== 'in_progress') {
              return;
            }

            // Apply active threshold filter when using active_only
            if (this.currentFilter === 'active_only' && !this.isWithinActiveThreshold(session.lastModified)) {
              return;
            }

            const taskNode: TreeNode = {
              id: `orphaned-${sessionId}-${session.agentId}-${todo.id}`,
              type: 'task',
              label: this.formatTaskLabel(todo, session),
              level: 4,
              expanded: false,
              parent: agentNode,
              data: { session, todo }
            };

            agentNode.children!.push(taskNode);
          });

          if (agentNode.children!.length > 0) {
            sessionNode.children!.push(agentNode);
          }
        }

        if (sessionNode.children!.length > 0) {
          orphanedNode.children!.push(sessionNode);
        }
      }

      if (orphanedNode.children!.length > 0) {
        this.treeRoot.children!.push(orphanedNode);
      }
    }

    // Sort tree nodes
    this.sortTreeNodes(this.treeRoot);
  }

  private formatTaskLabel(todo: TodoItem, session?: SessionData): string {
    // Restore colors but keep simple structure
    const statusColor = todo.status === 'pending' ? 'yellow-fg' : todo.status === 'in_progress' ? 'blue-fg' : 'green-fg';
    const priorityColor = todo.priority === 'high' ? 'red-fg' : todo.priority === 'medium' ? 'yellow-fg' : 'white-fg';
    
    const status = todo.status === 'pending' ? 'PEND' : todo.status === 'in_progress' ? 'PROG' : 'DONE';
    const priority = todo.priority === 'high' ? 'HI' : todo.priority === 'medium' ? 'MD' : 'LO';
    const fromNow = session ? this.getFromNow(session.lastModified) : '';
    const projectName = session?.projectPath ? this.getProjectName(session.projectPath) : 'Unknown';
    
    // Keep content mostly clean but allow basic Unicode
    const cleanContent = todo.content.replace(/\s+/g, ' ').trim();
    const truncatedContent = cleanContent.length > 40 ? cleanContent.substring(0, 40) + '...' : cleanContent;
    
    // Use colored status but simple structure
    return `{${statusColor}}${status}{/${statusColor}} {${priorityColor}}${priority}{/${priorityColor}} ${fromNow.padEnd(4)} ${projectName.padEnd(12)} ${truncatedContent}`;
  }

  private padWithWidth(str: string, targetWidth: number): string {
    const truncated = this.truncateWithWidth(str, targetWidth);
    const currentWidth = this.getDisplayWidth(truncated);
    const paddingNeeded = Math.max(0, targetWidth - currentWidth);
    return truncated + ' '.repeat(paddingNeeded);
  }

  private getFromNow(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMinutes < 1) return 'now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return `${Math.floor(diffDays / 7)}w`;
  }

  private isWithinActiveThreshold(date: Date): boolean {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;
    
    switch (this.activeThreshold) {
      case 'recent': return diffHours <= 6; // Last 6 hours
      case 'today': return diffHours <= 24; // Last 24 hours  
      case 'week': return diffDays <= 7; // Last 7 days
      case 'all': return true; // No time limit
      default: return true;
    }
  }

  private getDisplayWidth(str: string): number {
    let width = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      // Chinese characters and most Unicode characters take 2 spaces
      if (code > 127) {
        width += 2;
      } else {
        width += 1;
      }
    }
    return width;
  }

  private truncateWithWidth(str: string, maxWidth: number): string {
    let width = 0;
    let truncated = '';
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const charWidth = str.charCodeAt(i) > 127 ? 2 : 1;
      
      if (width + charWidth > maxWidth - 3) { // Reserve space for "..."
        return truncated + '...';
      }
      
      truncated += char;
      width += charWidth;
    }
    
    return truncated;
  }

  private getShortStatus(status: string): string {
    switch (status) {
      case 'pending': return 'PEND';
      case 'in_progress': return 'PROG';
      case 'completed': return 'DONE';
      default: return status.substring(0, 4).toUpperCase().padEnd(4);
    }
  }

  private getShortPriority(priority: string): string {
    switch (priority) {
      case 'high': return 'HI';
      case 'medium': return 'MD';
      case 'low': return 'LO';
      default: return priority.substring(0, 2).toUpperCase();
    }
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'pending': return '⏳';
      case 'in_progress': return '🔄';
      case 'completed': return '✅';
      default: return '❓';
    }
  }

  private getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }

  private sortTreeNodes(node: TreeNode) {
    if (!node.children) return;

    // Sort child nodes based on current sort criteria
    node.children.sort((a, b) => {
      if (a.type !== b.type) {
        // Projects first, then sessions, then agents, then tasks
        const typeOrder = { project: 1, session: 2, agent: 3, task: 4 };
        return typeOrder[a.type] - typeOrder[b.type];
      }

      if (a.type === 'task' && b.type === 'task') {
        const todoA = a.data.todo;
        const todoB = b.data.todo;
        
        let result = 0;
        
        switch (this.sortBy) {
          case 'priority':
            const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
            result = (priorityOrder[todoB.priority] || 0) - (priorityOrder[todoA.priority] || 0);
            break;
          case 'status':
            const statusOrder: Record<string, number> = { in_progress: 3, pending: 2, completed: 1 };
            result = (statusOrder[todoB.status] || 0) - (statusOrder[todoA.status] || 0);
            break;
          case 'modified':
            // Sort by session lastModified time (newest first)
            const sessionA = a.data.session;
            const sessionB = b.data.session;
            result = sessionB.lastModified.getTime() - sessionA.lastModified.getTime();
            break;
          case 'ascii':
            result = todoA.content.localeCompare(todoB.content);
            break;
          default:
            result = todoA.content.localeCompare(todoB.content);
        }
        
        return this.reverseSort ? -result : result;
      }

      // Sort non-task nodes by modified time when sortBy is 'modified'
      if (this.sortBy === 'modified') {
        // Get the most recent modification time for each node
        const getLatestModified = (node: TreeNode): number => {
          if (node.type === 'project') {
            let latest = 0;
            const projectData = node.data;
            if (projectData && projectData.sessions) {
              for (const sessions of projectData.sessions.values()) {
                for (const session of sessions) {
                  latest = Math.max(latest, session.lastModified.getTime());
                }
              }
            }
            return latest;
          } else if (node.type === 'session') {
            let latest = 0;
            const sessionData = node.data;
            if (sessionData && sessionData.sessions) {
              for (const session of sessionData.sessions) {
                latest = Math.max(latest, session.lastModified.getTime());
              }
            }
            return latest;
          } else if (node.type === 'agent') {
            return node.data.lastModified.getTime();
          }
          return 0;
        };
        
        const result = getLatestModified(b) - getLatestModified(a);
        return this.reverseSort ? -result : result;
      }
      
      const result = a.label.localeCompare(b.label);
      return this.reverseSort ? -result : result;
    });

    // Recursively sort children
    node.children.forEach(child => this.sortTreeNodes(child));
  }

  private flattenTree(node: TreeNode, result: TreeNode[] = []): TreeNode[] {
    result.push(node);
    
    if (node.expanded && node.children) {
      for (const child of node.children) {
        this.flattenTree(child, result);
      }
    }
    
    return result;
  }

  private getAllTasks(): TreeNode[] {
    const tasks: TreeNode[] = [];
    
    const collectTasks = (node: TreeNode) => {
      if (node.type === 'task') {
        tasks.push(node);
      }
      
      if (node.children) {
        for (const child of node.children) {
          collectTasks(child);
        }
      }
    };
    
    if (this.treeRoot) {
      collectTasks(this.treeRoot);
    }
    
    return tasks;
  }

  private updateTasksTree() {
    if (!this.treeRoot) return;

    let items: string[] = [];
    
    switch (this.displayMode) {
      case 'tree':
        this.flattenedTree = this.flattenTree(this.treeRoot).slice(1); // Skip root node
        items = this.flattenedTree.map(node => {
          const indent = '  '.repeat(node.level - 1);
          const expandIcon = node.children && node.children.length > 0 ? 
            (node.expanded ? '▼ ' : '▶ ') : '  ';
          
          return `${indent}${expandIcon}${node.label}`;
        });
        break;
        
      case 'flat':
        this.flattenedTree = this.getAllTasks();
        items = this.flattenedTree.map((node, index) => {
          const indexStr = `${index + 1}.`.padEnd(4);
          return `${indexStr}${node.label}`;
        });
        break;
        
      case 'list':
        this.flattenedTree = this.getAllTasks();
        items = this.flattenedTree.map((node, index) => {
          const indexStr = `${index + 1}.`.padEnd(4);
          return `${indexStr}${node.label}`;
        });
        break;
        
      default:
        this.flattenedTree = this.flattenTree(this.treeRoot).slice(1);
        items = this.flattenedTree.map(node => {
          const indent = '  '.repeat(node.level - 1);
          const expandIcon = node.children && node.children.length > 0 ? 
            (node.expanded ? '▼ ' : '▶ ') : '  ';
          
          return `${indent}${expandIcon}${node.label}`;
        });
    }

    this.tasksBox.setItems(items);
    
    // Maintain selection if possible
    if (this.selectedIndex >= items.length) {
      this.selectedIndex = Math.max(0, items.length - 1);
    }
    this.tasksBox.select(this.selectedIndex);
  }

  private toggleExpanded() {
    if (this.flattenedTree.length === 0) return;

    const selectedNode = this.flattenedTree[this.tasksBox.selected || 0];
    if (selectedNode && selectedNode.children && selectedNode.children.length > 0) {
      selectedNode.expanded = !selectedNode.expanded;
      this.updateTasksTree();
      this.screen.render();
    }
  }


  private getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'yellow-fg';
      case 'in_progress': return 'blue-fg';
      case 'completed': return 'green-fg';
      default: return 'white-fg';
    }
  }

  private getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high': return 'red-fg';
      case 'medium': return 'yellow-fg';
      case 'low': return 'green-fg';
      default: return 'white-fg';
    }
  }

  private updateHeader() {
    const headerContent = this.getHeaderContent();
    this.headerBox.setContent(headerContent);
  }

  private clearScreen() {
    // Back to basics: minimal clearing to avoid flicker
    this.tasksBox.clearItems();
  }
  
  private bindTasksBoxEvents() {
    // No need to re-bind - all events are on screen level, not tasksBox level
    // This method exists for future extensibility
  }

  private cycleFilter() {
    const filters = ['all', 'pending', 'in_progress', 'completed', 'active_only'];
    const currentIndex = filters.indexOf(this.currentFilter);
    this.currentFilter = filters[(currentIndex + 1) % filters.length];
    
    this.refreshData();
  }

  private cycleSortBy() {
    const sortOptions = ['priority', 'status', 'modified', 'ascii'];
    const currentIndex = sortOptions.indexOf(this.sortBy);
    this.sortBy = sortOptions[(currentIndex + 1) % sortOptions.length];
    this.refreshData();
  }

  private cycleActiveThreshold() {
    const thresholds = ['recent', 'today', 'week', 'all'];
    const currentIndex = thresholds.indexOf(this.activeThreshold);
    const newThreshold = thresholds[(currentIndex + 1) % thresholds.length];
    
    this.activeThreshold = newThreshold;
    this.currentFilter = 'active_only';
    
    this.refreshData();
  }

  private cycleDisplayMode() {
    const displayModes = ['tree', 'flat', 'list'];
    const currentIndex = displayModes.indexOf(this.displayMode);
    this.displayMode = displayModes[(currentIndex + 1) % displayModes.length];
    
    // Just refresh data - let blessed handle the rendering naturally
    this.refreshData();
  }

  private restartRefreshTimer() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    this.refreshInterval = setInterval(() => {
      this.refreshData();
    }, this.refreshIntervalMs);
  }

  private promptProjectFilter() {
    if (this.detailPopupVisible) {
      this.hideDetailPopup();
    }

    const inputBox = blessed.textbox({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '50%',
      height: 5,
      border: { type: 'line' },
      style: {
        fg: 'white',
        bg: 'black',
        border: { fg: 'cyan' }
      },
      label: 'Project Filter (partial path)',
      inputOnFocus: true,
      keys: true,
      mouse: true
    });

    this.currentDetailPopup = inputBox;
    this.detailPopupVisible = true;
    inputBox.setValue(this.projectFilter || '');
    
    inputBox.key(['escape'], () => {
      this.hideDetailPopup();
    });

    inputBox.key(['enter'], () => {
      const value = inputBox.getValue().trim();
      this.projectFilter = value || null;
      this.hideDetailPopup();
      this.refreshData();
    });

    this.screen.append(inputBox);
    inputBox.focus();
    this.screen.render();
  }

  private showTaskDetails() {
    const selectedIndex = this.tasksBox.selected;
    if (selectedIndex < 0 || selectedIndex >= this.flattenedTree.length) return;

    const selectedNode = this.flattenedTree[selectedIndex];
    
    if (selectedNode.type === 'task') {
      const session = selectedNode.data.session;
      const task = selectedNode.data.todo;
      this.showDetailsPopup(session, task);
    } else if (selectedNode.type === 'agent') {
      const session = selectedNode.data;
      this.showAgentDetails(session);
    } else if (selectedNode.type === 'session') {
      this.showSessionDetails(selectedNode);
    } else if (selectedNode.type === 'project') {
      this.showProjectDetails(selectedNode);
    }
  }

  private showAgentDetails(session: SessionData) {
    const popup = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '80%',
      height: '60%',
      border: { type: 'line' },
      style: {
        fg: 'white',
        bg: 'black',
        border: { fg: 'cyan' }
      },
      tags: true,
      keys: true,
      mouse: true,
      scrollable: true
    });

    const taskStats = session.todos.reduce((stats, todo) => {
      stats[todo.status] = (stats[todo.status] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    const content = `{bold}Agent Details{/bold}

{bold}Session ID:{/bold} ${session.sessionId}
{bold}Agent ID:{/bold} ${session.agentId}
{bold}Last Modified:{/bold} ${session.lastModified.toLocaleString()}
{bold}File Path:{/bold} ${session.filePath}

{bold}Task Statistics:{/bold}
• {yellow-fg}Pending:{/yellow-fg} ${taskStats.pending || 0}
• {blue-fg}In Progress:{/blue-fg} ${taskStats.in_progress || 0}
• {green-fg}Completed:{/green-fg} ${taskStats.completed || 0}
• {bold}Total:{/bold} ${session.todos.length}

{bold}All Tasks:{/bold}
${session.todos.map((todo, i) => {
  const statusIcon = this.getStatusIcon(todo.status);
  const priorityIcon = this.getPriorityIcon(todo.priority);
  const statusDisplay = this.getShortStatus(todo.status);
  const priorityDisplay = this.getShortPriority(todo.priority);
  const indexStr = `${i + 1}.`.padEnd(3);
  return `${indexStr}${statusIcon} ${statusDisplay} ${priorityIcon} ${priorityDisplay} ${todo.content}`;
}).join('\n')}

Press [Escape] to close`;

    popup.setContent(content);

    this.screen.append(popup);
    popup.focus();
    this.screen.render();
  }

  private showProjectDetails(projectNode: TreeNode) {
    const popup = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '80%',
      height: '60%',
      border: { type: 'line' },
      style: {
        fg: 'white',
        bg: 'black',
        border: { fg: 'cyan' }
      },
      tags: true,
      keys: true,
      mouse: true,
      scrollable: true
    });

    const sessionCount = projectNode.children?.length || 0;
    const totalAgents = projectNode.children?.reduce((sum, sessionNode) => {
      return sum + (sessionNode.children?.length || 0);
    }, 0) || 0;
    const totalTasks = projectNode.children?.reduce((sum, sessionNode) => {
      return sum + (sessionNode.children?.reduce((agentSum, agentNode) => {
        return agentSum + (agentNode.children?.length || 0);
      }, 0) || 0);
    }, 0) || 0;

    let statusStats: Record<string, number> = { pending: 0, in_progress: 0, completed: 0 };
    projectNode.children?.forEach(sessionNode => {
      sessionNode.children?.forEach(agentNode => {
        agentNode.children?.forEach(taskNode => {
          const task = taskNode.data.todo;
          statusStats[task.status] = (statusStats[task.status] || 0) + 1;
        });
      });
    });

    const projectData = projectNode.data;
    const projectPath = projectData?.projectPath || projectNode.id;
    const projectName = projectData?.projectName || path.basename(projectPath);

    const content = `{bold}Project Overview{/bold}

{bold}Project Name:{/bold} ${projectName}
{bold}Project Path:{/bold} ${projectPath}
{bold}Session Count:{/bold} ${sessionCount}
{bold}Total Agents:{/bold} ${totalAgents}
{bold}Total Tasks:{/bold} ${totalTasks}

{bold}Task Statistics:{/bold}
• {yellow-fg}Pending:{/yellow-fg} ${statusStats.pending}
• {blue-fg}In Progress:{/blue-fg} ${statusStats.in_progress}
• {green-fg}Completed:{/green-fg} ${statusStats.completed}

{bold}Sessions in this Project:{/bold}
${projectNode.children?.map((sessionNode, i) => {
  const sessionData = sessionNode.data;
  const sessionId = sessionData.sessionId;
  const agentCount = sessionNode.children?.length || 0;
  const taskCount = sessionNode.children?.reduce((sum, agentNode) => sum + (agentNode.children?.length || 0), 0) || 0;
  return `${i + 1}. 💬 ${sessionId.substring(0, 16)}... (${agentCount} agents, ${taskCount} tasks)`;
}).join('\n') || 'No sessions found'}

Press [Escape] to close`;

    popup.setContent(content);

    this.screen.append(popup);
    popup.focus();
    this.screen.render();
  }

  private showSessionDetails(sessionNode: TreeNode) {
    const popup = this.createDetailPopup({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '80%',
      height: '60%',
      border: { type: 'line' },
      style: {
        fg: 'white',
        bg: 'black',
        border: { fg: 'cyan' }
      },
      tags: true,
      keys: true,
      mouse: true,
      scrollable: true
    });

    const agentCount = sessionNode.children?.length || 0;
    const totalTasks = sessionNode.children?.reduce((sum, agentNode) => {
      return sum + (agentNode.children?.length || 0);
    }, 0) || 0;

    let statusStats: Record<string, number> = { pending: 0, in_progress: 0, completed: 0 };
    sessionNode.children?.forEach(agentNode => {
      agentNode.children?.forEach(taskNode => {
        const task = taskNode.data.todo;
        statusStats[task.status] = (statusStats[task.status] || 0) + 1;
      });
    });

    const content = `{bold}Session Overview{/bold}

{bold}Session ID:{/bold} ${sessionNode.id}
{bold}Agent Count:{/bold} ${agentCount}
{bold}Total Tasks:{/bold} ${totalTasks}

{bold}Task Statistics:{/bold}
• {yellow-fg}Pending:{/yellow-fg} ${statusStats.pending}
• {blue-fg}In Progress:{/blue-fg} ${statusStats.in_progress}
• {green-fg}Completed:{/green-fg} ${statusStats.completed}

{bold}Agents in this Session:{/bold}
${sessionNode.children?.map((agentNode, i) => {
  const taskCount = agentNode.children?.length || 0;
  const agentId = agentNode.data.agentId;
  return `${i + 1}. 🤖 ${agentId.substring(0, 16)}... (${taskCount} tasks)`;
}).join('\n') || 'No agents found'}

Press [Escape] to close`;

    popup.setContent(content);

    this.screen.append(popup);
    popup.focus();
    this.screen.render();
  }

  private showDetailsPopup(session: SessionData, task: TodoItem) {
    const popup = this.createDetailPopup({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '80%',
      height: '60%',
      border: { type: 'line' },
      style: {
        fg: 'white',
        bg: 'black',
        border: { fg: 'cyan' }
      },
      tags: true,
      keys: true,
      mouse: true,
      scrollable: true
    });

    const content = `{bold}Task Details{/bold}

{bold}Session ID:{/bold} ${session.sessionId}
{bold}Agent ID:{/bold} ${session.agentId}
{bold}Status:{/bold} {${this.getStatusColor(task.status)}}${task.status}{/${this.getStatusColor(task.status)}}
{bold}Priority:{/bold} {${this.getPriorityColor(task.priority)}}${task.priority}{/${this.getPriorityColor(task.priority)}}
{bold}Task ID:{/bold} ${task.id}
{bold}Last Modified:{/bold} ${session.lastModified.toLocaleString()}

{bold}Task Content:{/bold}
${task.content}

{bold}All Tasks in Session:{/bold}
${session.todos.map((t, i) => {
  const statusIcon = this.getStatusIcon(t.status);
  const priorityIcon = this.getPriorityIcon(t.priority);
  const statusDisplay = this.getShortStatus(t.status);
  const priorityDisplay = this.getShortPriority(t.priority);
  const indexStr = `${i + 1}.`.padEnd(3);
  return `${indexStr}${statusIcon} ${statusDisplay} ${priorityIcon} ${priorityDisplay} ${t.content}`;
}).join('\n')}

Press [Escape] to close`;

    popup.setContent(content);

    this.screen.append(popup);
    popup.focus();
    this.screen.render();
  }

  private helpPopup: any = null;

  private toggleHelp() {
    if (this.helpVisible) {
      this.hideHelp();
    } else {
      this.showHelp();
    }
  }

  private hideHelp() {
    if (this.helpPopup) {
      this.screen.remove(this.helpPopup);
      this.helpPopup = null;
      this.helpVisible = false;
      this.tasksBox.focus();
      this.screen.render();
    }
  }

  private hideDetailPopup() {
    if (this.currentDetailPopup) {
      this.screen.remove(this.currentDetailPopup);
      this.currentDetailPopup = null;
      this.detailPopupVisible = false;
      this.tasksBox.focus();
      this.screen.render();
    }
  }

  private createDetailPopup(config: any) {
    if (this.detailPopupVisible) {
      this.hideDetailPopup();
    }

    this.currentDetailPopup = blessed.box(config);
    this.detailPopupVisible = true;

    this.currentDetailPopup.key(['escape'], () => {
      this.hideDetailPopup();
    });

    return this.currentDetailPopup;
  }

  private showHelp() {
    if (this.helpVisible) return;

    this.helpPopup = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '60%',
      height: '50%',
      border: { type: 'line' },
      style: {
        fg: 'white',
        bg: 'black',
        border: { fg: 'cyan' }
      },
      tags: true,
      keys: true,
      mouse: true,
      scrollable: true
    });

    this.helpVisible = true;

    const helpContent = `{bold}Claude Code Task Monitor{/bold}

{bold}Current Settings:{/bold}
  Display Mode: ${this.displayMode}
  Sort By: ${this.sortBy}${this.reverseSort ? ' (reversed)' : ''}
  Filter: ${this.currentFilter}
  ${this.projectFilter ? `Project Filter: ${this.projectFilter}` : 'Project Filter: (none)'}
  Refresh Interval: ${this.refreshIntervalMs / 1000}s

{bold}Navigation:{/bold}
  ↑/↓ or j/k    - Move selection up/down
  Space         - Expand/collapse tree nodes (tree mode only)
  Enter         - Show details (project/session/agent/task)

{bold}Filtering & Sorting:{/bold}
  Tab           - Cycle through filters (all/pending/in_progress/completed/active)
  A             - Cycle active threshold (recent/today/week/all)
  S             - Cycle through sort options (priority/status/modified/ascii)
  V             - Toggle reverse sort order
  P             - Set project filter (input dialog)
  C             - Clear project filter

{bold}Display & Settings:{/bold}
  D             - Cycle display mode (tree/flat/list)
  +             - Increase refresh interval
  -             - Decrease refresh interval
  R             - Refresh data manually
  F1            - Show this help
  Q or Esc      - Quit

{bold}Tree Structure:{/bold}
  📁 Project    - Project directory
    💬 Session  - Claude Code session
      🤖 Agent  - Agent within session
        Task    - Individual todo task

{bold}Status Icons:{/bold}
  ⏳ Pending   - Task not started
  🔄 In Progress - Task being worked on
  ✅ Completed - Task finished

{bold}Priority Icons:{/bold}
  🔴 High      - Critical priority
  🟡 Medium    - Normal priority
  🟢 Low       - Low priority

{bold}Features:{/bold}
  • Hierarchical view by project → session → agent → task
  • Real-time monitoring with automatic updates
  • Interactive tree navigation with expand/collapse
  • Multi-level detail views for projects, sessions, agents, and tasks
  • Smart filtering and sorting within tree structure
  • Active Only filter shows only pending + in_progress tasks
  • Project-based organization with better name identifiers

{bold}Filters:{/bold}
  • All: Show all tasks
  • Pending: Show only pending tasks
  • In Progress: Show only in-progress tasks
  • Completed: Show only completed tasks
  • Active Only: Show only pending + in-progress tasks

Press [Escape], [Q], [F1], or [Enter] to close`;

    this.helpPopup.setContent(helpContent);

    this.helpPopup.key(['escape', 'q', 'f1', 'enter'], () => {
      this.hideHelp();
    });

    // Ensure help popup captures ESC before screen level handler
    this.helpPopup.on('keypress', (ch: any, key: any) => {
      if (key && key.name === 'escape') {
        this.hideHelp();
      }
    });

    this.screen.append(this.helpPopup);
    this.helpPopup.focus();
    this.screen.render();
  }

  private startFileWatcher() {
    if (this.watcherActive) return;

    this.watcherActive = true;
    
    // Start refresh interval
    this.refreshInterval = setInterval(() => {
      this.refreshData();
    }, this.refreshIntervalMs);

    // Watch for file changes
    try {
      fs.watch(this.todoPath, (eventType, filename) => {
        if (filename && filename.endsWith('.json')) {
          this.refreshData();
        }
      });
    } catch (error) {
      console.error('Warning: Could not watch todo directory');
    }
  }

  private cleanup() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    if (this.db) {
      this.db.close();
    }
    
    this.watcherActive = false;
  }

  public async start() {
    await this.initializeDatabase();
    await this.loadSessionData();
    this.buildTreeStructure();
    this.updateTasksTree();
    this.startFileWatcher();
    this.screen.render();
  }
}

interface MonitorOptions {
  displayMode?: string;
  order?: string;
  filter?: string;
  project?: string;
  reverse?: boolean;
  refreshInterval?: string;
}

export async function monitorCommand(options: MonitorOptions = {}) {
  const monitor = new CCTaskMonitor(options);
  await monitor.start();
}