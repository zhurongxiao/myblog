---
layout: post
title: "rust 错误处理：Box<dyn Error> vs 自定义枚举错误类型"
date: 2025-05-04 08:47:00 +0800
categories: gather

---

# Rust 错误处理：Box<dyn Error> vs 自定义枚举错误类型（如 BinanceError）

## ✅ 背景

在 Rust 中，我们可以使用 `Box<dyn std::error::Error>` 来快速处理各种错误，也可以自定义错误枚举类型（如 `BinanceError`）来细致地分类错误。本篇对两种方式的对比展开说明。

---

## ✅ 使用 Box<dyn Error>

### ✨ 优点：

* 简洁：只需一个 `?` 即可自动传播错误。
* 快速：适合脚本、小工具、demo。

### 🚫 缺点：

* 不可区分错误种类，难以匹配处理：

```rust
match send_email() {
    Err(e) => eprintln!("发生错误: {e}"),
    _ => {}
}
```

* 日志不可控，信息粒度低。
* 不利于项目扩展，例如自动重试、降级处理等。

---

## ✅ 使用自定义错误类型（如 BinanceError）

### ✨ 优点：

* 可精确区分错误来源（如 JSON、网络、地址解析、SMTP 等）。
* 允许匹配错误做不同处理：

```rust
match send_email() {
    Err(BinanceError::SerdeJsonError(e)) => {
        eprintln!("配置错误: {}", e);
    }
    Err(BinanceError::ApiError(msg)) => {
        eprintln!("API 报错: {}", msg);
    }
    _ => {}
}
```

* 错误信息更清晰、更可控（支持翻译、定制）。
* 便于结构化日志和后期扩展（重试、备用方案等）。

### 🚫 缺点：

* 如果不使用 `#[from]`，需要手动 `map_err`：

```rust
let email = Message::builder()
    .from(account.email.parse().map_err(|e| BinanceError::ApiError(format!("地址错误: {}", e)))?)
```

---

## ✅ 化繁为简：结合 thiserror 和 #\[from]

使用 `thiserror` 宏库 + `#[from]` 派生转换，可以让自定义错误和 `Box<dyn Error>` 一样简洁：

```rust
#[derive(Error, Debug)]
pub enum BinanceError {
    #[error(transparent)]
    LettreError(#[from] lettre::error::Error),

    #[error(transparent)]
    AddrError(#[from] lettre::address::AddressError),

    #[error(transparent)]
    SmtpError(#[from] lettre::transport::smtp::Error),

    #[error("发送失败: {0}")]
    SendError(String),
}
```

然后在函数里继续优雅使用 `?`：

```rust
let email = Message::builder()
    .from(account.email.parse()?)
    .to("xxx@qq.com".parse()?)
    .body(content.to_string())?;
```

---

## ✅ 何时用哪种方式？

| 场景            | 建议                       |
| ------------- | ------------------------ |
| 小工具、快速验证、demo | `Box<dyn Error>` 简洁高效    |
| 中大型项目、网络服务    | 自定义错误类型，利于维护扩展           |
| 需区分错误类型处理     | 自定义错误类型 + `#[from]` 简洁处理 |
| 先期开发，后期优化     | 开始用 Box，逐步迁移到枚举错误        |

---

## ✅ 总结

* 自定义错误看似冗长，但利于长远维护与错误控制。
* 搭配 `thiserror` 和 `#[from]`，可兼顾可读性与简洁性。
* 对于成长型项目，**推荐从一开始就定义错误枚举类型**，哪怕先只用几种变体。


