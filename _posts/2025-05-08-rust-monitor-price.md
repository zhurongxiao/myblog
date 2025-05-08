---
layout: post
title: "Rust monitor_price Explain"
date: 2025-05-08 16:55:00 +0800
categories: rust

---

# Code

```rust
    use once_cell::sync::Lazy;
    use std::fs::OpenOptions;
    use std::io::Write;
    use std::sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    };
    use std::thread::{self, JoinHandle};
    use std::time::Duration;

    // use crate::error::BinanceError;
    use crate::utils::redis::RedisUtil;
    use crate::utils::time::get_current_time;

    static THREAD_HANDLE: Lazy<Mutex<Option<JoinHandle<()>>>> = Lazy::new(|| Mutex::new(None));
    static RUNNING: Lazy<Mutex<Option<Arc<AtomicBool>>>> = Lazy::new(|| Mutex::new(None));

    const SIGNAL_FILE: &str = "/home/debian/tmp/Trigger_monitor_price.txt";
    const LOG_FILE: &str = "/home/debian/文档/shell/binance/config/monitor_price.log";

    fn log_message(msg: &str) {
        let timestamp = get_current_time();
        let full_msg = format!("[{}] {}\n", timestamp, msg);
        if let Ok(mut file) = OpenOptions::new().append(true).create(true).open(LOG_FILE) {
            let _ = file.write_all(full_msg.as_bytes());
        }
        println!("{}", full_msg.trim());
    }

    fn start_monitor_price_loop(running: Arc<AtomicBool>, key_group: u32) {
        log_message(&format!("📡 启动价格回撤监控线程（组号 {}）", key_group));

        // let monitor_key = format!("monitor{}", key_group);
        let redis_key = format!("monitor_price{}", key_group);
        //初始化range
        let _ = RedisUtil::set_hash_f64(&redis_key, "range", 150.0);
        loop {
            if !running.load(Ordering::Relaxed) {
                log_message("🛑 停止价格回撤监控线程");
                break;
            }
            RedisUtil::print_pool_status();

            let (monitor_price, side) = match RedisUtil::get_mixed_data(&redis_key) {
                Ok((num, text)) => {
                    println!("Retrieved: num = {}, text = '{}'", num, text);
                    (num, text)
                }
                Err(e) => {
                    eprintln!("Failed to retrieve data: {:?}", e);
                    // 如果Redis获取失败，使用默认值
                    (0.0, "SELL".to_string())
                }
            };

            let price = RedisUtil::hget("trend", "price").unwrap_or_else(|_| {
                // Redis 获取失败时尝试从文件读取
                std::fs::read_to_string("/tmp/price.txt")
                    .ok()
                    .and_then(|s| s.trim().parse::<f64>().ok())
                    .unwrap_or(0.0)
            });

            let profit = match side.as_str() {
                "BUY" => price - monitor_price,
                "SELL" => monitor_price - price,
                _ => {
                    log_message(&format!("❌ 无效方向参数: {}", side));
                    thread::sleep(Duration::from_secs(10));
                    continue;
                }
            };

            let mut max_profit = RedisUtil::get_hash_f64(&redis_key, "max_profit").unwrap_or(0.0);
            let same_sign = (profit >= 0.0) == (max_profit >= 0.0);
            let update = if same_sign {
                profit.abs() > max_profit.abs()
            } else {
                true
            };

            if update {
                let _ = RedisUtil::set_hash_f64(&redis_key, "max_profit", profit);

                max_profit = profit;
                log_message(&format!("✅ 更新最大浮盈为 {}", profit));
            }

            let range = RedisUtil::get_hash_f64(&redis_key, "range").unwrap_or(150.0);
            println!("range:{:?}", range);
            if max_profit.abs() < range {
                log_message(&format!("最大浮盈={} 未达触发门槛，跳过", max_profit));
                thread::sleep(Duration::from_secs(3));
                continue;
            }

            let drawdown = max_profit - profit;
            let threshold = if max_profit < 0.0 {
                max_profit.abs() * 0.5
            } else if max_profit < 200.0 {
                max_profit * 0.5
            } else {
                max_profit * 0.3
            };

            if drawdown.abs() >= threshold {
                let _ = std::fs::write(SIGNAL_FILE, "1\n");
                let _ = RedisUtil::del_hash_field(&redis_key, "max_profit");

                let label = if max_profit < 0.0 {
                    "[止损触发]"
                } else {
                    "[止盈回撤]"
                };
                log_message(&format!(
                    "{} 回撤={} ≥ {} ➝ 写入信号",
                    label,
                    drawdown.abs(),
                    threshold
                ));
            }

            thread::sleep(Duration::from_secs(10));
        }
    }

    pub fn start_monitor_price(key_group: u32) {
        let mut handle_guard = THREAD_HANDLE.lock().unwrap();
        let mut running_guard = RUNNING.lock().unwrap();

        if handle_guard.is_some() {
            println!("⚠️ 价格监控线程已在运行");
            return;
        }

        let running = Arc::new(AtomicBool::new(true));
        let handle = thread::spawn({
            let running_clone = running.clone();
            move || start_monitor_price_loop(running_clone, key_group)
        });

        *handle_guard = Some(handle);
        *running_guard = Some(running);
    }

    #[allow(dead_code)]
    pub fn stop_monitor_price() {
        let mut handle_guard = THREAD_HANDLE.lock().unwrap();
        let mut running_guard = RUNNING.lock().unwrap();

        if let Some(flag) = running_guard.take() {
            flag.store(false, Ordering::Relaxed);
        }

        if let Some(handle) = handle_guard.take() {
            let _ = handle.join();
        }

        log_message("🛑 文件监听已手动停止");
    }
```

# Rust 后台线程：价格回撤监控模块说明

本文档用于说明 `monitor_price` 模块的整体逻辑和用法，该模块在后台线程中运行，用于监控价格浮盈/浮亏并在触发止盈或止损条件时写入信号文件。

---

## 🧩 依赖项

* `once_cell::sync::Lazy`：用于静态初始化线程句柄和状态标志。
* `std::sync::{Arc, Mutex, AtomicBool}`：用于线程状态控制。
* `std::fs::{OpenOptions}`：日志写入。
* `std::thread`：用于后台线程管理。
* 自定义模块：

  * `RedisUtil`：封装 Redis 操作方法
  * `get_current_time`：时间戳函数

---

## 📁 常量定义

```rust
const SIGNAL_FILE: &str = "/home/debian/tmp/Trigger_monitor_price.txt";
const LOG_FILE: &str = "/home/debian/文档/shell/binance/config/monitor_price.log";
```

* `SIGNAL_FILE`：用于通知外部逻辑回撤触发。
* `LOG_FILE`：日志记录文件路径。

---

## 🧵 启动与控制线程

### 线程状态静态变量：

```rust
static THREAD_HANDLE: Lazy<Mutex<Option<JoinHandle<()>>>>
static RUNNING: Lazy<Mutex<Option<Arc<AtomicBool>>>>
```

### 启动函数 `start_monitor_price(key_group: u32)`：

* 检查线程是否已在运行。
* 若未运行，创建 `running` 标志，并开启新线程执行监控逻辑。

### 停止函数 `stop_monitor_price()`：

* 修改 `running` 标志为 false。
* 等待线程安全退出（通过 join）。

---

## 🔁 核心监控逻辑 `start_monitor_price_loop`

每 10 秒轮询一次价格、方向、最大浮盈等信息，并判断是否触发止盈/止损。

### 🔹 步骤概览

1. **读取 Redis 监控键名**：根据组号构造 redis key，如 `monitor_price1`。
2. **初始化 range**：默认设置触发门槛为 150。
3. **获取 monitor\_price 和方向**：

   * `monitor_price`：建仓价
   * `side`："BUY" or "SELL"
4. **获取当前价格**：优先从 Redis 中获取；失败则从 `/tmp/price.txt` 获取。
5. **计算浮盈/浮亏**：`profit = price - monitor_price`（或反之，取决于方向）。
6. **判断是否更新最大浮盈**：

   * 若方向相同（都正或都负）且绝对值变大则更新；
   * 若盈亏方向变更，则直接更新。
7. **判断是否超过 range 门槛**：未达到跳过。
8. **回撤判断**：

   * 如果正浮盈，则回撤超过 30% 触发；
   * 如果负浮亏，则反弹超过 50% 触发。
9. **触发信号写入**：

   * 写入信号文件为 "1\n"，
   * 删除 Redis 中最大浮盈字段，
   * 记录日志。

---

## 📌 日志写入 `log_message()`

```rust
fn log_message(msg: &str) {
    let timestamp = get_current_time();
    let full_msg = format!("[{}] {}\n", timestamp, msg);
    OpenOptions::new().append(true).create(true).open(LOG_FILE)
        .map(|mut file| file.write_all(full_msg.as_bytes()));
    println!("{}", full_msg.trim());
}
```

* 写入日志文件，并在控制台输出。
* 带时间戳。

---

## 🧪 可扩展性

支持通过 `key_group` 参数启动多个监控线程组：

* 每个线程监控独立的 Redis 键。
* 适用于多策略并行。

---

## ✅ 功能验证

建议定期调用 `RedisUtil::print_pool_status()` 观察连接池使用情况，确保无连接泄露或阻塞。

---

## 🧼 清理说明

* 通过 `stop_monitor_price()` 安全退出线程。
* `max_profit` 字段会在触发后被删除。
* `SIGNAL_FILE` 内容被设置为 "1\n"，可供外部 Shell/守护程序监听。

---

## 📎 附：可选增强

* 加入错误重试机制，避免 Redis 短暂失效导致逻辑异常。
* 将 `range` 设为动态可配置，实时调整策略灵敏度。
* 增加多组 key 统一管理模块，批量启动与停止。

---

如需扩展多个线程组并统一管理，可封装一个管理器结构体或全局调度器。

> 文档整理时间：2025-05-08
