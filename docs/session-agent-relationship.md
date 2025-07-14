# Claude Code 任务组织架构说明

## 概述

在 Claude Code 的任务管理系统中，有四个层级的组织结构：**Project → Session → Agent → Task**

## 1. Project（项目）

**定义**: 工作目录/项目目录，任务的最高级别组织单位
- 通常对应一个代码项目或工作目录
- 从 `~/.claude/projects/` 中解析得到
- 编码格式：`-Users-mark-projects-claude-code-manager` → `/Users/mark/projects/claude-code-manager`

## 2. Session（会话）

**定义**: 在项目中的一次完整 Claude Code 交互会话
- 每个会话有唯一的 Session ID（如：`1d59cca7-9a19-4582-b893-5f3758568111`）
- 代表用户与 Claude Code 的一次完整对话过程
- 属于特定的项目目录
- 可能包含多个 Agent

## 3. Agent（代理）

**定义**: 在会话中处理具体任务的执行单元
- 每个 Agent 有唯一的 Agent ID
- 负责处理特定的任务集合
- 维护自己的 todo 列表
- 通常第一个 Agent ID 与 Session ID 相同（主 Agent）

## 4. Task（任务）

**定义**: 具体的待办事项
- 每个任务有状态（pending/in_progress/completed）
- 有优先级（high/medium/low）
- 包含具体的任务内容

## 5. 完整的四级关系结构

### 典型关系结构
```
📁 Project: claude-code-manager (/Users/mark/projects/claude-code-manager)
├── 💬 Session: 1d59cca7-9a19-4582-b893-5f3758568111
│   ├── 🤖 Agent: Main (1d59cca7-9a19-4582-b893-5f3758568111)
│   │   ├── ⏳ Task: 修正插件类型映射
│   │   └── 🔄 Task: 更新代码结构
│   └── 🤖 Agent: d43c3b7c... (d43c3b7c-2532-4d8b-af3f-faa71e253a7d)
│       ├── ⏳ Task: 处理复杂逻辑
│       └── ✅ Task: 协作完成任务
├── 💬 Session: 4f78eb5b-a598-4151-9e02-02b95f675cb2
│   └── 🤖 Agent: Main (4f78eb5b-a598-4151-9e02-02b95f675cb2)
│       ├── ⏳ Task: 研究对话数据结构
│       └── 🔄 Task: 修改API支持
└── 💬 Session: ...
```

### 文件命名规则
```
{session-id}-agent-{agent-id}.json
```

**示例**：
- `1d59cca7-9a19-4582-b893-5f3758568111-agent-1d59cca7-9a19-4582-b893-5f3758568111.json`
- `1d59cca7-9a19-4582-b893-5f3758568111-agent-d43c3b7c-2532-4d8b-af3f-faa71e253a7d.json`

## 4. 多 Agent 场景

### 何时创建多个 Agent？
1. **任务复杂性**：复杂任务需要分解处理
2. **并行处理**：多个任务可以并行执行
3. **专门化处理**：不同 Agent 处理不同类型的任务
4. **任务延续**：当任务需要多轮处理时

### 实际例子
```bash
# 查看同一会话的多个 Agent
ls ~/.claude/todos/ | grep "26571337-ed12-400e-accd-c8c92e79bec3"

# 结果：
26571337-ed12-400e-accd-c8c92e79bec3-agent-173f24f0-7a2e-4ed2-8e47-229389d56c23.json
26571337-ed12-400e-accd-c8c92e79bec3-agent-26571337-ed12-400e-accd-c8c92e79bec3.json  
26571337-ed12-400e-accd-c8c92e79bec3-agent-41703376-c053-4595-ae40-0647716aca29.json
```

## 6. 监控器中的展示

### 四级树状结构
```
📁 claude-code-manager
  💬 Session: 26571337...
    🤖 Agent: Main         # 主 Agent
      ⏳ pending 🔴 high 主要任务
      🔄 in_progress 🟡 medium 处理中的任务
    🤖 Agent: 173f24f0...  # 协作 Agent
      ⏳ pending 🔴 high 协作任务
    🤖 Agent: 41703376...  # 特殊 Agent
      ✅ completed 🟢 low 已完成任务
  💬 Session: 4f78eb5b...
    🤖 Agent: Main
      ⏳ pending 🔴 high 新任务
📁 lovpen
  💬 Session: 001988f9...
    🤖 Agent: Main
      ✅ completed 🟢 low 已完成任务
📂 Unknown Projects        # 无法识别项目的会话
  💬 Session: ...
```

### 统计信息
- **Project 级别**：显示项目下所有会话、Agent 和任务的汇总统计
- **Session 级别**：显示会话下所有 Agent 的任务汇总
- **Agent 级别**：显示该 Agent 的任务详情
- **Task 级别**：显示具体任务信息

## 7. 实际应用场景

### 简单项目任务
```
📁 my-website
  💬 Session: abc123
    🤖 Agent: Main
      ⏳ Task: 修复 bug
      🔄 Task: 添加功能
```

### 复杂项目任务
```
📁 e-commerce-app
  💬 Session: def456
    🤖 Agent: Main         # 主控制器
      ⏳ Task: 分析需求
      🔄 Task: 协调各部分
    🤖 Agent: ghi789       # 前端处理
      ⏳ Task: 修改UI
      🔄 Task: 更新样式
    🤖 Agent: jkl012       # 后端处理
      ⏳ Task: 修改API
      🔄 Task: 数据库更新
  💬 Session: mno345
    🤖 Agent: Main
      ✅ Task: 部署优化
      🔄 Task: 性能调试
```

## 8. 监控优势

通过这种四级层级结构，监控器可以：
- 按项目组织和管理所有 Claude Code 任务
- 清晰展示项目 → 会话 → Agent → 任务的组织结构
- 快速定位问题所在的项目、会话或 Agent
- 统计不同层级的任务进度和状态
- 支持四级钻取查看详情
- 提供更好的 name identifier（项目名、主Agent等）

## 9. 最佳实践

1. **理解层级**：Project > Session > Agent > Task
2. **关注活跃**：使用 "Active Only" 过滤器专注进行中的任务
3. **多级查看**：在不同层级查看不同级别的详情
4. **项目组织**：通过项目视角管理多个 Claude Code 工作流
5. **实时监控**：利用实时更新跟踪任务状态变化
6. **智能识别**：主 Agent 显示为 "Main"，提供更好的可读性