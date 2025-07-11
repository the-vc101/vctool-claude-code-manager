# Claude Code Clipboard Monitor

🚀 跨平台剪切板监听器，自动处理 Claude Code 中的图片粘贴，提升开发体验。

## ✨ 功能特性

- 🔍 **智能检测**: 仅在 Claude Code 运行时工作
- 📋 **剪切板监听**: 实时监听剪切板图片内容
- 💾 **自动保存**: 图片自动保存到 `.tmp/` 目录
- 🔄 **路径替换**: 自动将剪切板内容替换为文件路径
- 🧹 **自动清理**: 24小时后自动清理过期文件
- 🌍 **跨平台**: 支持 macOS、Windows、Linux

## 🚀 快速开始

### 方法一：使用安装脚本

**macOS/Linux:**
```bash
chmod +x install.sh
./install.sh
```

**Windows:**
```cmd
install.bat
```

### 方法二：手动安装

```bash
# 安装依赖
pip install -r requirements.txt

# 或使用 pip 安装包
pip install -e .
```

### 启动监听器

```bash
# 方法一：直接运行
python3 clipboard_monitor.py

# 方法二：使用命令行工具 (如果通过 pip 安装)
claude-clipboard-monitor

# 方法三：使用启动脚本
./start_clipboard_monitor.sh    # macOS/Linux
start_clipboard_monitor.bat     # Windows
```

## 📖 使用方法

1. 启动监听器
2. 打开 Claude Code
3. 复制任意图片到剪切板（截图、文件、网页图片等）
4. 监听器会自动：
   - 检测到图片
   - 保存到 `.tmp/clipboard_YYYYMMDD_HHMMSS.png`
   - 将剪切板内容替换为文件路径
5. 在 Claude Code 中粘贴即可引用文件

## 🛠️ 技术细节

### 依赖项

- **Python 3.6+**
- **pillow**: 图片处理
- **pyperclip**: 跨平台剪切板操作
- **psutil**: 进程检测和监控

### 支持的图片格式

- PNG (主要输出格式)
- JPEG/JPG
- BMP
- GIF
- TIFF
- WebP

### 工作原理

1. **进程检测**: 持续检查 Claude Code 进程是否运行
2. **剪切板监听**: 定期检查剪切板内容变化
3. **图片识别**: 检测剪切板中的图片数据
4. **文件保存**: 将图片保存为 PNG 格式到临时目录
5. **路径替换**: 将剪切板内容替换为文件路径
6. **自动清理**: 定期清理过期的临时文件

## ⚙️ 配置选项

可以修改 `clipboard_monitor.py` 中的参数：

```python
monitor = ClipboardMonitor(
    tmp_dir=".tmp",        # 临时目录路径
    cleanup_hours=24       # 文件保留时间(小时)
)
```

### 环境变量

```bash
export CLIPBOARD_MONITOR_DIR="/custom/tmp/path"  # 自定义临时目录
export CLIPBOARD_MONITOR_CLEANUP_HOURS="48"     # 自定义清理时间
```

## 🔧 故障排除

### macOS 权限问题

如果遇到权限问题，需要在以下位置授权：
- **系统偏好设置 > 安全性与隐私 > 辅助功能**
- 添加终端或 Python 应用程序

### Windows 杀毒软件

部分杀毒软件可能会拦截剪切板监听，请：
1. 将项目目录添加到白名单
2. 允许 Python 访问剪切板

### Linux 剪切板支持

Linux 系统需要安装剪切板工具：

```bash
# X11 桌面环境
sudo apt install xclip

# Wayland 桌面环境
sudo apt install wl-clipboard

# 或者使用 dnf (Fedora/CentOS)
sudo dnf install xclip wl-clipboard
```

### 常见问题

**Q: 监听器无法检测到 Claude Code？**
A: 确保 Claude Code 进程名包含 "claude"，可能需要调整进程检测逻辑。

**Q: 图片没有保存？**
A: 检查 `.tmp/` 目录权限，确保 Python 有写入权限。

**Q: 剪切板内容没有替换？**
A: 某些应用可能锁定剪切板，尝试重启监听器。

## 📁 项目结构

```
claude-code-clipboard-monitor/
├── clipboard_monitor.py         # 主程序
├── setup.py                    # Python 包配置
├── requirements.txt            # 依赖列表
├── install.sh                 # macOS/Linux 安装脚本
├── install.bat                # Windows 安装脚本
├── start_clipboard_monitor.sh  # 启动脚本
├── start_clipboard_monitor.bat # Windows 启动脚本
├── README.md                   # 项目文档
├── LICENSE                     # 开源协议
└── .tmp/                       # 临时文件目录
    └── clipboard_*.png         # 保存的图片文件
```

## 🧪 开发

### 开发环境设置

```bash
# 克隆项目
git clone <repository-url>
cd claude-code-clipboard-monitor

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装开发依赖
pip install -e ".[dev]"

# 运行代码格式化
black clipboard_monitor.py

# 运行代码检查
flake8 clipboard_monitor.py
```

### 测试

```bash
# 运行测试
pytest tests/

# 手动测试
python3 clipboard_monitor.py --help
```

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 开源协议

本项目采用 MIT 协议 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Pillow](https://python-pillow.org/) - Python 图像处理库
- [pyperclip](https://github.com/asweigart/pyperclip) - 跨平台剪切板库
- [psutil](https://github.com/giampaolo/psutil) - 系统和进程监控库
- [Claude Code](https://claude.ai/code) - 启发本项目的优秀工具

## 📞 支持

如果您遇到问题或有功能建议，请：
- 创建 [Issue](https://github.com/user/claude-code-clipboard-monitor/issues)
- 查看 [FAQ](#故障排除) 部分
- 联系项目维护者

---

**让 Claude Code 的图片粘贴体验更加流畅！** 🎉