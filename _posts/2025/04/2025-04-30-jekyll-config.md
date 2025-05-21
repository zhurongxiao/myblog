---
layout: post
title: "jekyll _config.yml解读"
date: 2025-04-30 10:43:45 +0800
categories: gather jekyll-config 
author: YourName
---

# `_config.yml` 配置解析与优化建议

本笔记总结了 Jekyll 博客中 `_config.yml` 的各项配置说明、保留/删除建议，以及原因，便于日后查阅和维护。

---

## ✅ 核心配置区

```yaml
title: 我的知识库
baseurl: "/myblog"
url: "https://zhurongxiao.github.io"
timezone: Asia/Shanghai
lang: zh-CN
encoding: utf-8
```

**说明：**
- `baseurl` 设置为 GitHub Pages 仓库路径（项目页）。
- `url` 是完整网站地址。
- `lang`, `encoding`, `timezone` 影响 SEO、日期格式。

✅ 全部建议保留。

---

## ✅ Jekyll 设置区

```yaml
theme: minima
markdown: kramdown
highlighter: rouge
future: true
exclude:
  - Gemfile
  - Gemfile.lock
  - node_modules
  - vendor
  - .bundle
```

**说明：**
- `theme` 虽无实际作用（使用自定义布局），但 GitHub Pages 要求保留。
- `exclude` 排除不需构建的目录/文件。

✅ 全部建议保留。

---

## ✅ 插件配置（GitHub Pages 白名单）

```yaml
plugins:
  - jekyll-feed
  - jekyll-sitemap
  - jekyll-relative-links
  - jekyll-paginate
```

**说明：**
- `jekyll-feed`: 生成 RSS。
- `jekyll-sitemap`: 自动生成 sitemap.xml。
- `jekyll-relative-links`: 支持相对路径。
- `jekyll-paginate`: 支持分页（尚未使用）。

✅ 推荐保留，未来可能用。

---

## ✅ 集合配置

```yaml
collections:
  posts:
    output: true
    permalink: /:categories/:title/
  search:
    output: true
    permalink: /search/
```

**说明：**
- `posts` 是内置集合，修改了 URL 结构。
- `search` 是自定义集合，用于搜索页。

✅ 配置合理，建议保留。

---

## ✅ 自定义分类配置（用于前端导航）

```yaml
custom_categories:
  - name: Rust
    path: /rust/
    icon: fas fa-code
  - name: Shell
    path: /shell/
    icon: fas fa-terminal
  - name: Mac
    path: /mac/
    icon: fab fa-apple
```

**说明：**
- 用于渲染 sidebar.html / navbar.html。
- 非 Jekyll 内置，是自定义数据结构。

✅ 建议保留。

---

## 🔧 默认值配置 defaults（可精简）

```yaml
defaults:
  - scope:
      type: posts
      categories: rust
    values:
      rust_version: "1.70.0"
```

**说明：**
- 原始配置中的默认 layout 建议移除，更灵活。
- `rust_version` 是自定义字段，若未使用，也可移除。

✅ 可按需要保留或进一步删除。

---

## ✅ 技术优化

```yaml
kramdown:
  syntax_highlighter_opts:
    css_class: "highlight"
    block:
      line_numbers: false

sass:
  style: compressed
  sourcemap: never
```

**说明：**
- `kramdown` 配合 Rouge 高亮使用。
- `sass` 设置用于压缩 CSS。

✅ 建议保留。

---

## ✅ 总结建议

| 区块                                            | 建议                    |
| --------------------------------------------- | --------------------- |
| `title`, `url`, `baseurl`, `lang` 等           | ✅ 保留                  |
| `theme: minima`                               | ✅ 保留（GitHub Pages 兼容） |
| `defaults:`                                   | 🔧 可精简或移除部分           |
| `rust_version`                                | ❌ 若未使用，可删除            |
| `plugins`, `collections`, `custom_categories` | ✅ 保留                  |
| `exclude`, `sass`, `kramdown`                 | ✅ 保留                  |

