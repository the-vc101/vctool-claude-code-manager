#!/usr/bin/env python3
"""
Claude Code Clipboard Monitor
跨平台剪切板监听器，提升 Claude Code 使用体验
"""

from setuptools import setup, find_packages
import os

# 读取 README
def read_readme():
    with open("README.md", "r", encoding="utf-8") as f:
        return f.read()

setup(
    name="claude-code-clipboard-monitor",
    version="1.0.0",
    description="跨平台剪切板监听器，自动处理 Claude Code 中的图片粘贴",
    long_description=read_readme(),
    long_description_content_type="text/markdown",
    author="Claude Code User",
    python_requires=">=3.6",
    packages=find_packages(),
    py_modules=["clipboard_monitor"],
    install_requires=[
        "pillow>=8.0.0",
        "pyperclip>=1.8.0", 
        "psutil>=5.8.0"
    ],
    extras_require={
        "dev": [
            "pytest>=6.0.0",
            "black>=21.0.0",
            "flake8>=3.8.0"
        ]
    },
    entry_points={
        "console_scripts": [
            "claude-clipboard-monitor=clipboard_monitor:main",
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Utilities",
        "Topic :: System :: Monitoring",
    ],
    keywords="claude-code clipboard monitor automation productivity",
    project_urls={
        "Source": "https://github.com/user/claude-code-clipboard-monitor",
        "Bug Reports": "https://github.com/user/claude-code-clipboard-monitor/issues",
    },
)