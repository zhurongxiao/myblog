---
layout: post
title: "Rust 延时"
date: 2025-04-30 10:43:45 +0800
categories: rust sleep 
author: YourName
---

# Rust 实现延时的方法

## 同步延时（阻塞当前线程）

使用标准库的 `std::thread::sleep`：

```rust
use std::thread;
use std::time::Duration;

fn main() {
    println!("开始等待...");
    thread::sleep(Duration::from_secs(10));  // 阻塞10秒
    println!("10秒已过！");
}
```

## 异步延时（不阻塞线程）

### 使用 tokio 运行时

```rust
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    println!("开始异步等待...");
    sleep(Duration::from_secs(10)).await;  // 异步等待10秒
    println!("10秒已过！");
}
```

### 使用 async-std 运行时

```rust
use async_std::task;
use std::time::Duration;

#[async_std::main]
async fn main() {
    println!("开始等待...");
    task::sleep(Duration::from_secs(10)).await;  // 异步等待10秒
    println!("10秒已过！");
}
```

## 方法对比

| 方法 | 类型 | 是否阻塞线程 | 需要运行时 | 适用场景 |
|------|------|------------|-----------|----------|
| `thread::sleep` | 同步 | 是 | 不需要 | 简单同步程序 |
| `tokio::time::sleep` | 异步 | 否 | 需要 tokio | tokio 异步程序 |
| `async_std::task::sleep` | 异步 | 否 | 需要 async-std | async-std 异步程序 |

## 注意事项

1. 同步延时会阻塞当前线程，不适合异步上下文
2. 异步延时需要配合 `.await` 使用
3. 异步方法需要相应的运行时支持（tokio 或 async-std）
4. 延时精度受系统调度影响，不保证绝对精确