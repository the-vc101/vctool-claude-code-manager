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
  private currentFilter = 'all';
  private sortBy = 'priority';
  private todoPath: string;
  private dbPath: string;
  private db: Database.Database | null = null;

  constructor() {
    this.todoPath = path.join(os.homedir(), '.claude', 'todos');
    this.dbPath = path.join(os.homedir(), '.claude', 'db.sql');
    
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Claude Code Task Monitor',
      dockBorders: true,
      fullUnicode: true,
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

    // Main tasks tree
    this.tasksBox = blessed.list({
      parent: this.screen,
      top: 4,
      left: 0,
      width: '100%',
      height: '100%-6',
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
    });

    // Footer box
    this.footerBox = blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 2,
      border: { type: 'line' },
      style: {
        fg: 'white',
        bg: 'black',
        border: { fg: 'cyan' }
      },
      tags: true,
      content: '[Tab]Filter [A]Active Only [Enter]Details [Space]Expand/Collapse [S]Sort [R]Refresh [Q]Quit'
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
    
    return `{bold}Claude Code Task Monitor{/bold}                    [F1:Help] [F10:Quit]
Tasks: ${activeCount} active, ${pendingCount} pending, ${inProgressCount} in-progress, ${completedCount} completed
Projects: ${projectCount} | Sessions: ${sessionCount} | Filter: ${filterDisplay}    [{green-fg}●{/green-fg}] Live`;
  }

  private getFilterDisplay(): string {
    switch (this.currentFilter) {
      case 'all': return '{white-fg}All{/white-fg}';
      case 'pending': return '{yellow-fg}Pending{/yellow-fg}';
      case 'in_progress': return '{blue-fg}In Progress{/blue-fg}';
      case 'completed': return '{green-fg}Completed{/green-fg}';
      case 'active_only': return '{cyan-fg}Active Only{/cyan-fg}';
      default: return this.currentFilter;
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
      this.showHelp();
    });

    this.screen.key(['f10'], () => {
      this.cleanup();
      process.exit(0);
    });

    this.screen.key(['a'], () => {
      this.currentFilter = 'active_only';
      this.refreshData();
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
      const projectNode: TreeNode = {
        id: projectPath,
        type: 'project',
        label: `📁 ${projectInfo.projectName}`,
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
          label: `💬 Session: ${sessionId.substring(0, 8)}...`,
          level: 2,
          expanded: true,
          children: [],
          parent: projectNode,
          data: { sessionId, sessions }
        };

        // Add agents under each session
        for (const session of sessions) {
          const agentNode: TreeNode = {
            id: `${projectPath}-${sessionId}-${session.agentId}`,
            type: 'agent',
            label: `🤖 Agent: ${session.agentId === sessionId ? 'Main' : session.agentId.substring(0, 8) + '...'}`,
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

            const taskNode: TreeNode = {
              id: `${projectPath}-${sessionId}-${session.agentId}-${todo.id}`,
              type: 'task',
              label: this.formatTaskLabel(todo),
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
          label: `💬 Session: ${sessionId.substring(0, 8)}...`,
          level: 2,
          expanded: true,
          children: [],
          parent: orphanedNode,
          data: { sessionId, sessions }
        };

        // Add agents and tasks
        for (const session of sessions) {
          const agentNode: TreeNode = {
            id: `orphaned-${sessionId}-${session.agentId}`,
            type: 'agent',
            label: `🤖 Agent: ${session.agentId === sessionId ? 'Main' : session.agentId.substring(0, 8) + '...'}`,
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

            const taskNode: TreeNode = {
              id: `orphaned-${sessionId}-${session.agentId}-${todo.id}`,
              type: 'task',
              label: this.formatTaskLabel(todo),
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

  private formatTaskLabel(todo: TodoItem): string {
    const statusIcon = this.getStatusIcon(todo.status);
    const priorityIcon = this.getPriorityIcon(todo.priority);
    const statusColor = this.getStatusColor(todo.status);
    const priorityColor = this.getPriorityColor(todo.priority);
    
    const truncatedContent = todo.content.length > 50 ? 
      todo.content.substring(0, 47) + '...' : todo.content;
    
    return `${statusIcon} {${statusColor}}${todo.status}{/${statusColor}} ${priorityIcon} {${priorityColor}}${todo.priority}{/${priorityColor}} ${truncatedContent}`;
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
        
        switch (this.sortBy) {
          case 'priority':
            const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
            return (priorityOrder[todoB.priority] || 0) - (priorityOrder[todoA.priority] || 0);
          case 'status':
            const statusOrder: Record<string, number> = { in_progress: 3, pending: 2, completed: 1 };
            return (statusOrder[todoB.status] || 0) - (statusOrder[todoA.status] || 0);
          default:
            return todoA.content.localeCompare(todoB.content);
        }
      }

      return a.label.localeCompare(b.label);
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

  private updateTasksTree() {
    if (!this.treeRoot) return;

    this.flattenedTree = this.flattenTree(this.treeRoot).slice(1); // Skip root node
    
    const items = this.flattenedTree.map(node => {
      const indent = '  '.repeat(node.level - 1);
      const expandIcon = node.children && node.children.length > 0 ? 
        (node.expanded ? '▼ ' : '▶ ') : '  ';
      
      return `${indent}${expandIcon}${node.label}`;
    });

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
    this.headerBox.setContent(this.getHeaderContent());
  }

  private cycleFilter() {
    const filters = ['all', 'pending', 'in_progress', 'completed', 'active_only'];
    const currentIndex = filters.indexOf(this.currentFilter);
    this.currentFilter = filters[(currentIndex + 1) % filters.length];
    this.refreshData();
  }

  private cycleSortBy() {
    const sortOptions = ['priority', 'status', 'modified', 'session'];
    const currentIndex = sortOptions.indexOf(this.sortBy);
    this.sortBy = sortOptions[(currentIndex + 1) % sortOptions.length];
    this.refreshData();
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
  return `${i + 1}. ${statusIcon} ${priorityIcon} ${todo.content}`;
}).join('\n')}

Press [Escape] to close`;

    popup.setContent(content);
    
    popup.key(['escape'], () => {
      this.screen.remove(popup);
      this.screen.render();
    });

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
    
    popup.key(['escape'], () => {
      this.screen.remove(popup);
      this.screen.render();
    });

    this.screen.append(popup);
    popup.focus();
    this.screen.render();
  }

  private showSessionDetails(sessionNode: TreeNode) {
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
    
    popup.key(['escape'], () => {
      this.screen.remove(popup);
      this.screen.render();
    });

    this.screen.append(popup);
    popup.focus();
    this.screen.render();
  }

  private showDetailsPopup(session: SessionData, task: TodoItem) {
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
${session.todos.map((t, i) => `${i + 1}. [${t.status}] ${t.content}`).join('\n')}

Press [Escape] to close`;

    popup.setContent(content);

    popup.key(['escape'], () => {
      this.screen.remove(popup);
      this.screen.render();
    });

    this.screen.append(popup);
    popup.focus();
    this.screen.render();
  }

  private showHelp() {
    const helpPopup = blessed.box({
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

    const helpContent = `{bold}Claude Code Task Monitor - Tree View{/bold}

{bold}Navigation:{/bold}
  ↑/↓ or j/k    - Move selection up/down
  Space         - Expand/collapse tree nodes
  Enter         - Show details (project/session/agent/task)
  Tab           - Cycle through filters (all/pending/in_progress/completed/active_only)
  A             - Quick switch to Active Only filter
  S             - Cycle through sort options (priority/status/modified/session)
  R             - Refresh data
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

Press [Escape] to close`;

    helpPopup.setContent(helpContent);

    helpPopup.key(['escape'], () => {
      this.screen.remove(helpPopup);
      this.screen.render();
    });

    this.screen.append(helpPopup);
    helpPopup.focus();
    this.screen.render();
  }

  private startFileWatcher() {
    if (this.watcherActive) return;

    this.watcherActive = true;
    
    // Start refresh interval
    this.refreshInterval = setInterval(() => {
      this.refreshData();
    }, 2000); // Update every 2 seconds

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

export async function monitorCommand() {
  const monitor = new CCTaskMonitor();
  await monitor.start();
}