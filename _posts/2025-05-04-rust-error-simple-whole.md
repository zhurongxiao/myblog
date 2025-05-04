---
layout: post
title: "Rust 邮件发送错误模块对比（完整 vs 简化）"
date: 2025-05-04 09:19:00 +0800
categories: rust 

---

## Rust 邮件发送模块对比（完整 vs 简化）

### 完整版（带错误处理 + 输出）

```rust
use lettre::message::header::ContentType;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};
use once_cell::sync::Lazy;
use rand::Rng;
use serde::Deserialize;
use std::fs::read_to_string;
use std::sync::atomic::{AtomicUsize, Ordering};

#[derive(Debug, Deserialize)]
struct EmailAccount {
    email: String,
    password: String,
}

// 全局账号列表，只加载一次
static ACCOUNTS: Lazy<Vec<EmailAccount>> = Lazy::new(|| {
    let path = "/home/debian/tmp/email_accounts.json";
    let content = read_to_string(path).expect("无法读取邮箱账号文件");
    serde_json::from_str(&content).expect("邮箱账号 JSON 格式错误")
});

// 使用 AtomicUsize 实现无锁轮询索引，初始化为随机数
static ACCOUNT_INDEX: Lazy<AtomicUsize> = Lazy::new(|| {
    let init_index = rand::thread_rng().gen_range(0..ACCOUNTS.len());
    AtomicUsize::new(init_index)
});

/// 发送邮件（HTML 格式）
///
/// # 参数
/// - `content`: 邮件正文（HTML 格式）
pub fn send_email(content: &str) -> Result<(), Box<dyn std::error::Error>> {
    // 获取当前索引并轮转
    let index = ACCOUNT_INDEX.fetch_add(1, Ordering::Relaxed) % ACCOUNTS.len();
    let account = &ACCOUNTS[index];

    // 构造邮件内容
    let email = Message::builder()
        .from(account.email.parse()?)
        .to("350058148@qq.com".parse()?)
        .subject("Rust 邮件通知")
        .header(ContentType::TEXT_HTML)
        .body(content.to_string())?;

    let creds = Credentials::new(account.email.clone(), account.password.clone());

    // 使用 163 SMTP 发送
    let mailer = SmtpTransport::relay("smtp.163.com")?
        .credentials(creds)
        .build();

    match mailer.send(&email) {
        Ok(_) => {
            println!("✅ 邮件已发送：{}", account.email);
        }
        Err(e) => {
            eprintln!("❌ 邮件发送失败: {:?}", e);
        }
    }

    Ok(())
}
```

---

### 简化版（忽略错误 + 静默失败）

```rust
use lettre::message::header::ContentType;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};
use once_cell::sync::Lazy;
use rand::Rng;
use serde::Deserialize;
use std::fs::read_to_string;
use std::sync::atomic::{AtomicUsize, Ordering};

#[derive(Debug, Deserialize)]
struct EmailAccount {
    email: String,
    password: String,
}

static ACCOUNTS: Lazy<Vec<EmailAccount>> = Lazy::new(|| {
    read_to_string("/home/debian/tmp/email_accounts.json")
        .ok()
        .and_then(|c| serde_json::from_str(&c).ok())
        .unwrap_or_default()
});

static ACCOUNT_INDEX: Lazy<AtomicUsize> = Lazy::new(|| {
    let init = if !ACCOUNTS.is_empty() {
        rand::thread_rng().gen_range(0..ACCOUNTS.len())
    } else {
        0
    };
    AtomicUsize::new(init)
});

pub fn send_email(content: &str) {
    if ACCOUNTS.is_empty() {
        return;
    }

    let index = ACCOUNT_INDEX.fetch_add(1, Ordering::Relaxed) % ACCOUNTS.len();
    let account = &ACCOUNTS[index];

    let email = Message::builder()
        .from(account.email.parse().ok()?)
        .to("350058148@qq.com".parse().ok()?)
        .subject("Rust 邮件通知")
        .header(ContentType::TEXT_HTML)
        .body(content.to_string())
        .ok()?;

    let creds = Credentials::new(account.email.clone(), account.password.clone());

    let mailer = SmtpTransport::relay("smtp.163.com")
        .ok()?
        .credentials(creds)
        .build();

    if mailer.send(&email).is_ok() {
        println!("✅ 邮件已发送：{}", account.email);
    }
}
```

---

### 对比总结

| 项目      | 完整版                  | 简化版               |
| ------- | -------------------- | ----------------- |
| 错误处理    | 明确输出错误信息，便于排查        | 静默忽略错误，适合不关心错误的场景 |
| 调试与上线使用 | 更适合调试或正式环境           | 更适合脚本测试或非关键通知     |
| 代码复杂度   | 较高，Result / match 较多 | 更简洁，逻辑清楚          |
| 稳定性与健壮性 | 更健壮，能应对各种错误          | 有风险，错误信息被吞掉       |


