Claude
  Code确实有一个完整的todo管理系统，包括：

  1. 持久化存储 - ~/.claude/todos/
  目录下有377个JSON文件，每个会话都有自己的todo列表
  2. 工具接口 - TodoWrite和TodoRead工具用于程序化管理任务
  3. 命令接口 - /add-task 和 /update-task
  命令用于用户友好的任务管理
  4. 数据库跟踪 - 所有工具执行都在SQLite数据库中追踪

  每个会话的todo文件按照[session-id]-agent-[agent-id].json
  格式命名，包含任务内容、状态、优先级等信息。

