---
layout: post
title: "rust 错误处理不终止进程"
date: 2025-05-04 09:02:00 +0800
categories: rust

---

# Rust 错误处理：发送邮件时不中断程序

## 场景

你希望调用 `send_email` 函数时，如果发送失败，只打印错误，不中断程序执行。

---

## 原始代码

```rust
pub fn send_email(content: &str) -> Result<(), Box<dyn std::error::Error>> {
    // ... 构造邮件等略 ...

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

## 正确调用方式（不中断进程）

### ✅ 使用 `if let Err`

```rust
fn main() {
    let html_content = "<h1>测试邮件</h1>";

    if let Err(e) = send_email(html_content) {
        eprintln!("📛 发送邮件失败：{}", e);
    }

    println!("📢 主程序继续运行...");
}
```

### ✅ 使用 `match`

```rust
fn main() {
    let html_content = "<h1>Hello</h1>";

    match send_email(html_content) {
        Ok(_) => println!("✅ 邮件发送成功"),
        Err(e) => eprintln!("❌ 邮件发送失败: {}", e),
    }

    println!("✅ 程序未中断，继续执行其他逻辑");
}
```

---

## 错误写法（会终止进程）

```rust
fn main() -> Result<(), Box<dyn std::error::Error>> {
    send_email("内容")?; // 错误会被传播，main 返回 Err，导致程序退出
    Ok(())
}
```

---

## 总结

| 用法                   | 是否中断进程 | 说明             |
| -------------------- | ------ | -------------- |
| `?` 传播错误             | 是      | 错误未处理，main 会退出 |
| `if let Err(...)` 捕获 | 否      | 手动处理错误，程序继续运行  |
| `match` 捕获           | 否      | 同上             |

---

## 建议

在需要健壮运行的场景（如轮询、守护进程、批量发送），应当显式捕获错误并记录日志，而不是让程序因一个邮件失败而退出。


