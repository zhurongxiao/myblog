---
layout: post
title: "Native vim multi-point input"
date: 2025-08-21 14:24:00 +0800
categories: gather

---



Excellent question! This is a powerful Vim technique. There are two primary ways to achieve this, depending on your exact goal.

### Method 1: Using Multiple Cursors (with a Plugin)

This is the most intuitive method for users coming from modern editors like VSCode. Vim itself doesn't have built-in multiple cursors, but a fantastic plugin adds this functionality.

**Plugin: `mg979/vim-visual-multi`** (The most popular and well-maintained option)

1.  **Install it with your plugin manager** (e.g., vim-plug, Vundle, Packer).
    For vim-plug, add this to your `.vimrc`:
    ```vim
    Plug 'mg979/vim-visual-multi'
    ```

2.  **Reload your `.vimrc`** and run `:PlugInstall`.

3.  **How to use it:**
    *   **`<C-N>` (Ctrl+N):** Press this while your cursor is on a word. It will select that word and add a cursor. Press `<C-N>` again on the *next* occurrence of the word to add another cursor, and so on.
    *   **`<S-Arrow>` (Shift+Arrow Keys):** In Visual mode, this lets you create a vertical block of cursors on consecutive lines.
    *   **Edit:** Once you have multiple cursors, anything you type (like `i`, `c`, `a`, or just normal text) will be applied to *all* cursor locations simultaneously.
    *   **`q`** skips the current match, **`Q`** removes the current cursor.

This method is best for making the same change on multiple, non-aligned words or patterns.

### 安装与配置

#### 1. 安装插件
- **使用 vim-plug**（推荐）：  
  在 `.vimrc` 或 `init.vim` 中添加：  
  ```
  Plug 'mg979/vim-visual-multi', {'branch': 'master'}
  ```
  保存后执行 `:PlugInstall`。

- **使用 Vim 8+ 原生包管理**：  
  ```
  mkdir -p ~/.vim/pack/plugins/start
  git clone https://github.com/mg979/vim-visual-multi ~/.vim/pack/plugins/start/vim-visual-multi
  ```

#### 2. 基础配置（可选）
在 `.vimrc` 中添加以下配置以优化体验：
```
" 启用鼠标映射
let g:VM_mouse_mappings = 1
" 设置主题（可选）
let g:VM_theme = 'iceblue'
" 自定义快捷键（可选）
let g:VM_maps = {}
let g:VM_maps["Undo"] = 'u'
let g:VM_maps["Redo"] = '<C-r>'
```

---

### 基本使用方法

#### 1. 启动多光标模式
- **选择单词**：将光标放在目标单词上，按 `Ctrl+N` 选中该单词，再次按 `Ctrl+N` 可逐个添加相同单词的匹配项。
- **垂直创建光标**：按 `Ctrl+Down` 在下方逐行添加光标，`Ctrl+Up` 向上添加。
- **跳过当前匹配**：按 `q` 跳过当前匹配项并继续选择下一个。

#### 2. 编辑操作
- **批量修改**：选中多个目标后，按 `c` 进入插入模式，输入新内容后按 `Esc`，所有选中位置同步更新。
- **对齐功能**：选中多列后，按 `\a`（默认前缀键为 `\`）可对齐到指定字符（如 `=`）。
- **模式切换**：按 `Tab` 在 **Cursor Mode**（光标模式）和 **Extend Mode**（扩展模式）间切换，前者支持普通模式命令，后者类似可视模式。

#### 3. 导航与删除
- **切换光标**：按 `n/N` 跳转到下一个/上一个匹配项，`[/]` 选择相邻光标。
- **删除光标**：按 `Q` 删除当前光标或选区。

---

### 高级技巧
- **宏与命令**：在多光标模式下可录制宏（`qa` 开始，`q` 结束），然后对所有光标执行宏（`@a`）。
- **结合其他插件**：与 `vim-surround`、`vim-commentary` 等插件配合使用，可实现批量注释或环绕符号修改。

---

### 常见问题
- **快捷键冲突**：若 `Ctrl+N` 被占用，可在配置中重新映射（如 `let g:VM_maps["Find Under"] = '<C-d>'`）。
- **主题不生效**：确保已安装支持的颜色主题，或移除主题配置使用默认样式。

通过以上步骤，即可在 Vim/Neovim 中实现类似 VS Code 的多光标高效编辑。
