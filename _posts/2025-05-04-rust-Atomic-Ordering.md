---
layout: post
title: "rust Atomic Ordering 可见性问题示例"
date: 2025-05-04 08:35:00 +0800
categories: rust

---


# Atomic Ordering 可见性问题示例

在使用 Rust 的原子类型时，错误地选择 `Ordering` 可能会导致不同线程之间的数据不可见，进而出现逻辑错误。

以下是一个最常见的例子：线程 A 写入共享变量后设置“准备就绪”标志，线程 B 检查标志后读取变量，但由于 `Ordering` 不当，读取的值可能仍然是旧的。

---

## ⚠️ 错误示例：使用 `Relaxed` 导致线程间数据不可见

```rust
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::thread;

static READY: AtomicBool = AtomicBool::new(false);
static DATA: AtomicUsize = AtomicUsize::new(0);

fn main() {
    let writer = thread::spawn(|| {
        DATA.store(42, Ordering::Relaxed);        // 写入数据
        READY.store(true, Ordering::Relaxed);     // 设置“准备好”标志
    });

    let reader = thread::spawn(|| {
        while !READY.load(Ordering::Relaxed) {
            std::hint::spin_loop(); // 忙等待
        }
        println!("Read data: {}", DATA.load(Ordering::Relaxed));
    });

    writer.join().unwrap();
    reader.join().unwrap();
}
```

### 💥 可能输出：

```
Read data: 0
```

### ❓ 为什么？

* `Relaxed` 允许 CPU 和编译器乱序执行指令。
* `DATA.store(42)` 可能在 `READY.store(true)` 之后执行。
* 线程 B 虽然看到 `READY = true`，但不保证看到最新的 `DATA`。

---

## ✅ 正确示例：使用 `Release` / `Acquire` 保证顺序

```rust
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::thread;

static READY: AtomicBool = AtomicBool::new(false);
static DATA: AtomicUsize = AtomicUsize::new(0);

fn main() {
    let writer = thread::spawn(|| {
        DATA.store(42, Ordering::Relaxed);        // 写入数据
        READY.store(true, Ordering::Release);     // 通知“写入完成”
    });

    let reader = thread::spawn(|| {
        while !READY.load(Ordering::Acquire) {
            std::hint::spin_loop(); // 忙等待
        }
        println!("Read data: {}", DATA.load(Ordering::Relaxed));
    });

    writer.join().unwrap();
    reader.join().unwrap();
}
```

### ✅ 输出稳定：

```
Read data: 42
```

---

## 📌 内存顺序总结

| Ordering  | 含义描述                                      |
| --------- | ----------------------------------------- |
| `Relaxed` | 不保证任何顺序，仅保证原子性。适合无数据依赖的计数器、自增器。           |
| `Release` | 写操作的后续修改，在读者使用 `Acquire` 时才可见。用于“发布”状态。   |
| `Acquire` | 读取时，保证之前其他线程的 `Release` 写入可见。用于“读取已发布状态”。 |
| `SeqCst`  | 最严格的顺序，保证所有线程中观察到相同的修改顺序，成本高。             |

---

## ✅ 使用建议

* 自增计数器等无共享状态依赖：`Relaxed`
* 标志位 + 共享数据模型：**写 Release / 读 Acquire**
* 多线程有复杂依赖：建议用 `SeqCst` 或干脆使用 `Mutex` 简化问题

---

这个例子展示了：**原子操作并不等于同步操作**，真正安全的数据同步必须配合正确的 `Ordering` 策略使用。


