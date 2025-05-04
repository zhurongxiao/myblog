---
layout: post
title: "rust 驼峰命名法 snake_case"
date: 2025-05-03 05:45:00 +0800
categories: rust

---


# Rust 中 `#[serde(rename_all = "camelCase")]` 的作用解释

本文件解释为何使用 `#[serde(rename_all = "camelCase")]`，而不是直接将结构体字段命名为驼峰形式。

---

## ✅ 背景：Rust 与 API 命名风格不同

- Rust 的命名风格：`snake_case`（下划线小写）  
- 常见 Web API（如 Binance）：`camelCase`（驼峰命名）

例如，API 返回：

```json
{
  "entryPrice": "30500.23",
  "markPrice": "30450.55"
}
```

Rust 中我们更习惯写成：

```rust
pub struct PositionRisk {
    pub entry_price: String,
    pub mark_price: String,
}
```

---

## ❓ 为什么不直接在 Rust 中用 `camelCase`

### 🔸 原因一：不符合 Rust 风格指南

Rust 官方建议结构体字段使用 `snake_case` 命名方式。违背此规范会让代码看起来“不地道”，不统一。

### 🔸 原因二：工具和生态不友好

使用 `camelCase` 会被 lint 工具（如 Clippy）警告，IDE 补全也不标准，维护成本更高。

### 🔸 原因三：跨团队协作困难

Rust 开发者普遍期望看到 `snake_case`，使用 `camelCase` 容易让他人困惑。

---

## ✅ `#[serde(rename_all = "camelCase")]` 的作用

该属性作用于整个结构体，在序列化/反序列化时：

- 自动将 Rust 的 `snake_case` 字段映射为 JSON 的 `camelCase` 字段名
- 不影响结构体内部字段的命名规范

### 示例：

```rust
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PositionRisk {
    pub entry_price: String,
    pub mark_price: String,
}
```

在处理如下 JSON 时不报错：

```json
{
  "entryPrice": "30500.23",
  "markPrice": "30450.55"
}
```

---

## ✅ 总结建议

| 项目               | 建议做法                         |
|--------------------|----------------------------------|
| 字段命名风格       | 使用 `snake_case`                |
| JSON 命名差异处理  | 使用 `#[serde(rename_all)]` 统一 |
| 单字段重命名       | 使用 `#[serde(rename = "...")]` |

---

## ✅ 补充：单字段重命名方式

```rust
#[serde(rename = "entryPrice")]
pub entry_price: String,
```

适用于仅重命名个别字段的情况。

---

