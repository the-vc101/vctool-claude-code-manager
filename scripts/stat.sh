jq -r '
# 为旧版本 jq 定义 lpad 函数，用于给数字左侧补零
# lpad(length; character)
def lpad(len; pad_char):
  tostring as $s |
  if ($s | length) < len then
    ([range(len - ($s | length))] | map(pad_char) | join("")) + $s
  else
    $s
  end;

# 在这里定义你想要的最大显示宽度
80 as $width |

.projects
| to_entries
| map(
    {
      path: .key,
      total_size: (.value | tostring | length),
      history_items: (
        .value.history? // []
        | map(
            {
              display: .display,
              # size 字段现在不再显示，但为了排序，我们仍然需要计算它
              size: (tostring | length)
            }
          )
      )
    }
  )
| sort_by(.total_size) | reverse
| .[]
| (
    "──────────────────────────────────────────────────",
    "Project: \(.path)",
    "  - TOTAL SIZE: \(.total_size) bytes",
    "  - History Details (\( .history_items | length ) entries):",

    # 核心改动在这里：
    (
      .history_items
      | to_entries   # -> [ {key: 0, value: item}, {key: 1, value: item}, ... ]
      | .[]          # 迭代每一个带索引的条目
      |
      # 构建新的输出格式 "01. content..."
      # 1. 获取索引 .key, +1, 转为字符串, 用 lpad 补零到两位
      # 2. 获取内容 .value.display, 合并为单行, 并进行截断
      "  " # 添加一些缩进
      + ( (.key + 1) | tostring | lpad(2; "0") )
      + ". "
      + ( .value.display | gsub("\n"; " ") | if (length > $width) then .[0:$width-3] + "..." else . end )
    )
  )
' ~/.claude-2025-06-27T11:56:28+0800.json