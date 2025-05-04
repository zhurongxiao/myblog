---
layout: post
title: "rust AtomicUsize and  Mutex"
date: 2025-05-03 16:33:00 +0800
categories: rust

---

# AtomicUsize vs Mutex<usize> 用于索引管理对比

在 Rust 中，如果需要在多个线程或函数中安全地轮询一个索引值（如发送邮件时轮询多个邮箱账号），可以使用 `AtomicUsize` 或 `Mutex<usize>` 实现。以下是对这两者的详细对比、原理分析和示例演示，便于查阅。

---

## 一句话总结区别

| 项目    | `AtomicUsize`   | `Mutex<usize>`           |
| ----- | --------------- | ------------------------ |
| 原理    | 原子操作（无锁，CPU 支持） | 加锁（线程阻塞式）                |
| 开销    | 极低，适合频繁读写       | 相对更大，涉及线程调度              |
| 并发访问  | 不阻塞，立即完成        | 同时只能有一个线程访问              |
| 适合场景  | 计数器、自增器、索引轮询等   | 多字段结构/复杂数据               |
| 用法复杂度 | 稍复杂，需要指定内存一致性顺序 | 简单，直接 `.lock().unwrap()` |

---

## 模拟数据代入：轮询账号索引

假设有账号数组如下：

```rust
let accounts = ["a1", "a2", "a3"];
```

模拟连续调用 3 次 `send_email()` 函数，比较 `AtomicUsize` 与 `Mutex<usize>` 的行为差异。

### ✅ 使用 AtomicUsize

```rust
static ACCOUNT_INDEX: AtomicUsize = AtomicUsize::new(1);
```

每次调用：

```rust
let index = ACCOUNT_INDEX.fetch_add(1, Ordering::Relaxed) % 3;
```

执行流程：

| 调用次数 | `ACCOUNT_INDEX` 值 | `index` | 使用账号         |
| ---- | ----------------- | ------- | ------------ |
| 第一次  | 1 → 2             | 1       | accounts\[1] |
| 第二次  | 2 → 3             | 2       | accounts\[2] |
| 第三次  | 3 → 4             | 0       | accounts\[0] |

**特点：**

* 线程安全
* 无需加锁
* 高性能，适合频繁调用

---

### 🛑 使用 Mutex<usize>

```rust
static ACCOUNT_INDEX: Mutex<usize> = Mutex::new(1);
```

每次调用：

```rust
let mut guard = ACCOUNT_INDEX.lock().unwrap();
let index = *guard;
*guard = (index + 1) % 3;
```

执行流程：

| 调用次数 | 进入锁前 `*guard` | `index` | 使用账号         |
| ---- | ------------- | ------- | ------------ |
| 第一次  | 1             | 1       | accounts\[1] |
| 第二次  | 2             | 2       | accounts\[2] |
| 第三次  | 0             | 0       | accounts\[0] |

**特点：**

* 正确但有锁
* 每次都要阻塞并等待锁释放
* 并发下可能产生性能瓶颈

---

## 底层原理简图

```
AtomicUsize (无锁)
   ┌────────────┐
   │ CPU Cache  │
   │ 原子加操作 │
   └────┬───────┘
        ▼
   内存直接修改
   非阻塞，适合频繁写

Mutex<usize> (有锁)
   ┌─────────────┐
   │ 线程A 加锁   │
   │ 访问变量     │
   └────┬────────┘
        │
   ┌────▼─────┐
   │ 线程B 等待│
   └──────────┘
   一次只允许一个线程进入
```

---

## 选择建议总结

| 场景            | 推荐方案               |
| ------------- | ------------------ |
| 频繁自增索引、计数器、轮询 | `AtomicUsize ✅`    |
| 需要锁住结构体多个字段更新 | `Mutex ✅`          |
| 单线程程序         | `Cell/RefCell` 更轻量 |
| 不清楚是否并发       | `Mutex` 更保守安全      |

---

## 示例推荐：`AtomicUsize` 轮询账号

```rust
static ACCOUNT_INDEX: Lazy<AtomicUsize> = Lazy::new(|| {
    let init = rand::thread_rng().gen_range(0..ACCOUNTS.len());
    AtomicUsize::new(init)
});

let index = ACCOUNT_INDEX.fetch_add(1, Ordering::Relaxed) % ACCOUNTS.len();
let account = &ACCOUNTS[index];
```

---

## 总结

* `AtomicUsize` 非常适合处理简单数值的高性能并发修改
* `Mutex` 更适合锁住复合结构体的完整访问
* 如果你只是在 CLI 工具中轮询账号，推荐使用 `AtomicUsize`


