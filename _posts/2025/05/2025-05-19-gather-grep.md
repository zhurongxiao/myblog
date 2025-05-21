---
layout: post
title: "grep 连带打印"
date: 2025-05-19 01:08:00 +0800
categories: gather

---

要让 `grep` 在查询到匹配行时 **连带打印它的上一行**，可以使用 `-B`（Before）选项。具体命令如下：

```bash
grep -B 1 "prices_std_dev" /home/debian/tmp/logs/binance.log
```

### 说明：
- `-B 1`：显示匹配行 **及之前的 1 行**（`-B 2` 会显示前 2 行，依此类推）。
- 如果匹配行是文件的第一行，则不会打印不存在的“上一行”。

---

### 其他常用 `grep` 上下文控制选项：

| 选项 | 作用 |
|------|------|
| `-A 1` | 显示匹配行 **及之后的 1 行**（After） |
| `-C 1` | 显示匹配行 **及前后各 1 行**（Context） |
{:.markdown-table}
例如：
```bash
# 显示匹配行及前后各 1 行
grep -C 1 "prices_std_dev" /home/debian/tmp/logs/binance.log
```

---

### 如果日志是结构化格式（如 JSON）
建议改用 `jq` 或 `awk` 更精准地提取上下文：
```bash
# 用 awk 打印匹配行及上一行
awk '/prices_std_dev/ {print prev_line; print $0} {prev_line=$0}' /home/debian/tmp/logs/binance.log
```


To let `grep` print the previous line when it finds a matching line, use the `-B` (Before) option. The specific command is as follows:

```bash
grep -B 1 "prices_std_dev" /home/debian/tmp/logs/binance.log
```

### Description:
- `-B 1`: Display the matching line **and the previous line** (`-B 2` will display the previous 2 lines, and so on).
- If the matching line is the first line of the file, the non-existent "previous line" will not be printed.

---

### Other commonly used `grep` context control options:

| Option | Function |
|------|------|
| `-A 1` | Display matching line **and 1 line after** (After) |
| `-C 1` | Display matching line **and 1 line 
{:.markdown-table}
before and after** (Context) |

For example:
```bash
# Display matching line and 1 line before and after
grep -C 1 "prices_std_dev" /home/debian/tmp/logs/binance.log
```

---

### If the log is in a structured format (such as JSON),
it is recommended to use `jq` or `awk` to extract the context more accurately:
```bash
# Use awk to print the matching line and the previous line
awk '/prices_std_dev/ {print prev_line; print $0} {prev_line=$0}' /home/debian/tmp/logs/binance.log
```

如果你想要在 `grep` 匹配到目标行（如 `"prices_std_dev"`）后，**再额外打印另一条件的行**，可以通过以下方式实现：

---

### **方法 1：`grep -A` + 管道 + `grep`（推荐）**
```bash
grep -A 1 "prices_std_dev" /home/debian/tmp/logs/binance.log | grep -A 1 "另一条件"
```
**作用**：
1. 先匹配 `"prices_std_dev"` 并输出该行及下一行（`-A 1`）。
2. 再对结果匹配 `"另一条件"`，输出符合条件的行及其下一行。

---

### **方法 2：`awk`（精确控制）**
如果条件较复杂（例如需要匹配不同关键字的行），可以用 `awk`：
```bash
awk '
  /prices_std_dev/ {print; getline; print}  # 打印匹配行及下一行
  /另一条件/ {print}                        # 额外打印另一条件的行
' /home/debian/tmp/logs/binance.log
```

---

### **方法 3：`sed`（按行处理）**
```bash
sed -n '
  /prices_std_dev/{p;n;p}  # 打印匹配行及下一行
  /另一条件/p              # 打印另一条件的行
' /home/debian/tmp/logs/binance.log
```

---

### **示例场景**
假设日志内容如下：
```
2023-01-01 数据A
2023-01-01 prices_std_dev: 0.5
2023-01-01 数据B
2023-01-01 另一条件: XYZ
2023-01-01 数据C
```
运行命令：
```bash
grep -A 1 "prices_std_dev" binance.log | grep -A 1 "另一条件"
```
输出：
```
2023-01-01 prices_std_dev: 0.5
2023-01-01 数据B
2023-01-01 另一条件: XYZ
```

---

### **如何选择？**
- **简单条件** → 用 `grep` + 管道（方法 1）。
- **复杂逻辑** → 用 `awk`（方法 2）。
- **需要更灵活的行控制** → 用 `sed`（方法 3）。

If you want to **print another condition line** after `grep` matches the target line (such as `"prices_std_dev"`), you can do it in the following way:

---

### **Method 1: `grep -A` + pipe + `grep` (recommended)**
```bash
grep -A 1 "prices_std_dev" /home/debian/tmp/logs/binance.log | grep -A 1 "another condition"
```
**Effect**:

1. First match `"prices_std_dev"` and output the line and the next line (`-A 1`).

2. Then match `"another condition"` to the result, and output the line that meets the condition and the next line.

---

### **Method 2: `awk` (precise control)**
If the conditions are complex (for example, lines that need to match different keywords), you can use `awk`:
```bash
awk '
/prices_std_dev/ {print; getline; print} # Print the matching line and the next line
/another condition/ {print} # Print the line of another condition in addition
' /home/debian/tmp/logs/binance.log
```

---

### **Method 3: `sed` (process by line)**
```bash
sed -n '
/prices_std_dev/{p;n;p} # Print the matching line and the next line
/another condition/p # Print the line of another condition
' /home/debian/tmp/logs/binance.log
```

---

### **Example scenario**
Suppose the log content is as follows:
```
2023-01-01 Data A
2023-01-01 prices_std_dev: 0.5
2023-01-01 Data B
2023-01-01 Another condition: XYZ
2023-01-01 Data C
```
Run command:
```bash
grep -A 1 "prices_std_dev" binance.log | grep -A 1 "Another condition"
```
Output:
```
2023-01-01 prices_std_dev: 0.5
2023-01-01 Data B
2023-01-01 Another condition: XYZ
```

---

### **How ​​to choose? **
- **Simple condition** → Use `grep` + pipe (method 1).
- **Complex logic** → Use `awk` (Method 2).
- **Need more flexible line control** → Use `sed` (Method 3).