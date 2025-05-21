---
layout: post
title: "Rust 日志节流宏"
date: 2025-05-21 09:10:00 +0800
categories: rust

---

对，你完全说对了。如果你希望以下两行：

```rust
log_message_throttle!(3, "highs: {:?}", highs);
log_message_throttle!(3, "low: {:?}", lows);
```

**在同一轮打印中都能生效**，而不是因为共用同一个 `LOG_MESSAGE_COUNTER` 被“节流”掉一条，那就应该给它们用**不同的静态计数器**。

---

## ✅ 正确做法：为每类 throttle 单独加计数器

你可以这样改：

### 在 `macros.rs` 中添加两个计数器：

{% raw %}
```rust
pub static LOG_HIGHS_COUNTER: Lazy<AtomicUsize> = Lazy::new(|| AtomicUsize::new(0));
pub static LOG_LOWS_COUNTER: Lazy<AtomicUsize> = Lazy::new(|| AtomicUsize::new(0));
```
{% endraw %}

### 定义两个宏：

{% raw %}
```rust
#[macro_export]
macro_rules! log_highs_throttle {
    ($n:expr, $($arg:tt)*) => {{
        let count = $crate::macros::LOG_HIGHS_COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        if count % $n == 0 {
            $crate::log_message!($($arg)*);
        }
    }};
}}

#[macro_export]
macro_rules! log_lows_throttle {
    ($n:expr, $($arg:tt)*) => {{
        let count = $crate::macros::LOG_LOWS_COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        if count % $n == 0 {
            $crate::log_message!($($arg)*);
        }
    }};
}}
```
{% endraw %}

### 然后调用时：

```rust
log_highs_throttle!(3, "highs: {:?}", highs);
log_lows_throttle!(3, "lows: {:?}", lows);
```

---

## 🔁 或者通用写法（传入标识符）

如果你不想复制那么多宏，也可以用一个宏 + 枚举匹配来做，但这种方式比上面稍复杂，适合你代码多起来后再考虑重构。

---

## ✅ 总结

当前情况使用不同的计数器变量是最简单可控的方案，能让你：

* **每一类信息独立节流**；
* **调试时不丢日志**；
* **便于未来扩展不同 throttle 控制逻辑**。

你这样思考是对的，可以放心按这个方向优化下去。需要我帮你整理这几个宏我也可以直接生成给你。

Yes, you are absolutely right. If you want the following two lines:

```rust
log_message_throttle!(3, "highs: {:?}", highs);
log_message_throttle!(3, "low: {:?}", lows);
```

**to work in the same round of printing**, instead of being "throttled" because they share the same `LOG_MESSAGE_COUNTER`, then you should use **different static counters** for them.

---

## ✅ Correct approach: add a separate counter for each type of throttle

You can change it like this:

### Add two counters in `macros.rs`:

```rust
pub static LOG_HIGHS_COUNTER: Lazy<AtomicUsize> = Lazy::new(|| AtomicUsize::new(0));
pub static LOG_LOWS_COUNTER: Lazy<AtomicUsize> = Lazy::new(|| AtomicUsize::new(0));
```

### Define two macros:
{% raw %}
```rust
#[macro_export]
macro_rules! log_highs_throttle {
($n:expr, $($arg:tt)*) => {{
let count = $crate::macros::LOG_HIGHS_COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed); 
if count % $n == 0 { 
$crate::log_message!($($arg)*); 
} 
}};
}}

#[macro_export]
macro_rules! log_lows_throttle { 
($n:expr, $($arg:tt)*) => {{ 
let count = $crate::macros::LOG_LOWS_COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed); 
if count % $n == 0 { 
$crate::log_message!($($arg)*); 
} 
}};
}}
```
{% endraw %}
### Then when calling:

```rust
log_highs_throttle!(3, "highs: {:?}", highs);
log_lows_throttle!(3, "lows: {:?}", lows);
```

---

## 🔁 Or general writing (pass in identifiers)

If you don't want to copy so many macros, you can also use a macro + enumeration matching to do it, but this method is slightly more complicated than the above, suitable for you to consider refactoring after the code is more.

---

## ✅ Summary

Using different counter variables is the simplest and controllable solution for the current situation, which allows you to:

* **Each type of information is throttled independently**;

* **No log loss during debugging**;

* **Easy to expand different throttle control logic in the future**.

You are right to think this way, you can rest assured to optimize in this direction. If you need me to help you organize these macros, I can also generate them for you directly.

### problem
这不是好的解决办法，如果我有1000条需要打印时就需要1000个变量了  

完全理解你的顾虑！确实，如果每条日志都用一个独立的静态计数器，数量多了管理非常麻烦，而且代码臃肿。

---

# 更优雅的设计方案

## 思路：用**单一的全局计数器 + 标识符 (字符串) 进行分组**

* 不同日志类别用字符串标签区分，比如 `"highs"`, `"lows"`, `"orders"`, `"trades"`…
* 维护一个线程安全的全局计数器映射表，比如用 `DashMap<String, AtomicUsize>`，或者 `Mutex<HashMap<...>>`。
* 宏里传入标签，内部根据标签从这个全局 map 里取计数器，然后递增和判断是否打印。

这样就不用写一堆静态变量，动态按需求分配计数器。

---

# 一个示范实现思路

假设你有一个 `log_throttle` 宏，调用时写：

```rust
log_throttle!("highs", 3, "highs: {:?}", highs);
log_throttle!("lows", 3, "lows: {:?}", lows);
```

* 第一个参数是标签字符串
* 第二个是节流次数
* 剩下是格式化内容

---

## 代码示例（伪代码）
{% raw %}
```rust
use once_cell::sync::Lazy;
use dashmap::DashMap;
use std::sync::atomic::{AtomicUsize, Ordering};

static LOG_COUNTERS: Lazy<DashMap<&'static str, AtomicUsize>> = Lazy::new(|| DashMap::new());

#[macro_export]
macro_rules! log_throttle {
    ($tag:expr, $n:expr, $($arg:tt)*) => {{
        use std::sync::atomic::Ordering;

        // 先取计数器，没有则插入一个新的 AtomicUsize(0)
        let counter = $crate::LOG_COUNTERS.entry($tag)
            .or_insert_with(|| AtomicUsize::new(0));

        let count = counter.fetch_add(1, Ordering::Relaxed);
        if count % $n == 0 {
            $crate::log_message!($($arg)*);
        }
    }};
}
```
{% endraw %}
---

# 说明

* 你需要在 `Cargo.toml` 添加依赖 `dashmap = "5"` （线程安全、高性能的并发哈希表）
* `LOG_COUNTERS` 是全局唯一 map，存所有标签的计数器
* 计数器是动态添加的，不用事先声明
* 节流宏调用时只需要传标签字符串，代码简洁又灵活

---

# 这样你就可以

```rust
log_throttle!("highs", 3, "highs: {:?}", highs);
log_throttle!("lows", 5, "lows: {:?}", lows);
log_throttle!("orders", 10, "orders count: {}", order_count);
```

每个标签独立节流，且只用一个全局存储管理计数器。

---

需要我帮你写完整示例或者集成进你现有代码么？  
I completely understand your concerns! Indeed, if each log uses an independent static counter, it will be very troublesome to manage the large number of logs, and the code will be bloated.

---

# A more elegant design

## Idea: Use **single global counter + identifier (string) for grouping**

* Use string labels to distinguish different log categories, such as `"highs"`, `"lows"`, `"orders"`, `"trades"`...

* Maintain a thread-safe global counter map, such as `DashMap<String, AtomicUsize>`, or `Mutex<HashMap<...>>`.

* Pass the label in the macro, and the counter is taken from this global map according to the label, and then incremented and determined whether to print.

In this way, there is no need to write a bunch of static variables, and the counters are dynamically allocated according to demand.

---

# A demonstration implementation idea

Suppose you have a `log_throttle` macro, and write the following when calling it:

```rust
log_throttle!("highs", 3, "highs: {:?}", highs);
log_throttle!("lows", 3, "lows: {:?}", lows);
```

* The first parameter is the label string
* The second is the number of throttling times
* The rest is formatting content

---

## Code example (pseudocode)
{% raw %}
```rust
use once_cell::sync::Lazy;
use dashmap::DashMap;
use std::sync::atomic::{AtomicUsize, Ordering};

static LOG_COUNTERS: Lazy<DashMap<&'static str, AtomicUsize>> = Lazy::new(|| DashMap::new());

#[macro_export]
macro_rules! log_throttle {
($tag:expr, $n:expr, $($arg:tt)*) => {{
use std::sync::atomic::Ordering;

// Get the counter first, if not, insert a new one AtomicUsize(0)
let counter = $crate::LOG_COUNTERS.entry($tag)
.or_insert_with(|| AtomicUsize::new(0));

let count = counter.fetch_add(1, Ordering::Relaxed);
if count % $n == 0 {
$crate::log_message!($($arg)*);
}
}};
}
```
{% endraw %}
---

# Notes

* You need to add dependency `dashmap = "5"` in `Cargo.toml` (Thread-safe, high-performance concurrent hash table)
* `LOG_COUNTERS` is a globally unique map that stores counters for all tags
* Counters are added dynamically and do not need to be declared in advance
* When calling the throttling macro, you only need to pass the tag string, and the code is concise and flexible

---

# So you can

```rust
log_throttle!("highs", 3, "highs: {:?}", highs);
log_throttle!("lows", 5, "lows: {:?}", lows);
log_throttle!("orders", 10, "orders count: {}", order_count);
```

Each tag is throttled independently, and only one global storage is used to manage counters.

---

Do you need me to write a complete example for you or integrate it into your existing code?  

好的！我帮你把目前的宏文件改成基于**标签字符串动态管理节流计数器**的版本，使用 `DashMap` 来管理计数器。

请先在 `Cargo.toml` 里加依赖：

```toml
dashmap = "5"
once_cell = "1"
chrono = "0.4"
```

---

下面是修改后的宏文件内容，假设文件名还是 `macros.rs`，你可以替换你现有的代码：
{% raw %}
```rust
use std::sync::atomic::{AtomicUsize, Ordering};
use once_cell::sync::Lazy;
use dashmap::DashMap;

// 全局日志计数器映射，key 是标签字符串，value 是计数器
pub static LOG_COUNTERS: Lazy<DashMap<&'static str, AtomicUsize>> = Lazy::new(|| DashMap::new());

#[macro_export]
macro_rules! log_message_throttle {
    ($tag:expr, $n:expr, $($arg:tt)*) => {{
        // 取或插入计数器
        let counter = $crate::macros::LOG_COUNTERS.entry($tag)
            .or_insert_with(|| AtomicUsize::new(0));
        let count = counter.fetch_add(1, Ordering::Relaxed);
        if count % $n == 0 {
            use std::fs::OpenOptions;
            use std::io::Write;
            use chrono::Local;

            const LOG_FILE: &str = "/home/debian/文档/shell/binance/config/monitor_price.log";
            let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S");
            let msg = format!($($arg)*);
            let full_msg = format!("[{}] {}\n", timestamp, msg);

            if let Ok(mut file) = OpenOptions::new().append(true).create(true).open(LOG_FILE) {
                let _ = file.write_all(full_msg.as_bytes());
            }
            println!("{}", full_msg.trim());
        }
    }};
}

#[macro_export]
macro_rules! log_message {
    ($($arg:tt)*) => {{
        use std::fs::OpenOptions;
        use std::io::Write;
        use chrono::Local;

        const LOG_FILE: &str = "/home/debian/文档/shell/binance/config/monitor_price.log";
        let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S");
        let msg = format!($($arg)*);
        let full_msg = format!("[{}] {}\n", timestamp, msg);

        if let Ok(mut file) = OpenOptions::new().append(true).create(true).open(LOG_FILE) {
            let _ = file.write_all(full_msg.as_bytes());
        }
        println!("{}", full_msg.trim());
    }};
}

#[macro_export]
macro_rules! log_throttle {
    ($tag:expr, $n:expr, $($arg:tt)*) => {{
        // 取或插入计数器
        let counter = $crate::macros::LOG_COUNTERS.entry($tag)
            .or_insert_with(|| AtomicUsize::new(0));
        let count = counter.fetch_add(1, Ordering::Relaxed);
        if count % $n == 0 {
            // 你这里用了 `info!`，确保调用宏处有合适的日志依赖和初始化
            log::info!($($arg)*);
        }
    }};
}
```
{% endraw %}

---

# 使用示例

```rust
log_message_throttle!("highs", 3, "highs: {:?}", highs);
log_message_throttle!("lows", 3, "lows: {:?}", lows);

log_throttle!("orders", 5, "New order: {:?}", order);
```

---

# 说明

* `log_message_throttle!` 和 `log_throttle!` 宏都接收第一个参数作为字符串标签，用于在全局 map 中区分计数器。
* 只会在对应标签的计数器满足节流条件时打印。
* 共享同一个全局 `LOG_COUNTERS`，不需要为每个标签写静态变量。
* 你用 `log_throttle!` 的时候，确保已初始化日志库（比如 `env_logger::init()` 或者 `tracing_subscriber`），否则 `log::info!` 不会输出。

---

需要我帮你写完整的示例 `main.rs` 演示调用和日志初始化么？
  
OK! I will help you change the current macro file to a version that dynamically manages the throttling counter based on the **label string**, and use `DashMap` to manage the counter.

Please add dependencies in `Cargo.toml` first:

```toml
dashmap = "5"
once_cell = "1"
chrono = "0.4"
```

---

Here is the modified macro file content, assuming the file name is still `macros.rs`, you can replace your existing code:
{% raw %}
```rust
use std::sync::atomic::{AtomicUsize, Ordering};
use once_cell::sync::Lazy;
use dashmap::DashMap;

// Global log counter map, key is the label string, value is the counter
pub static LOG_COUNTERS: Lazy<DashMap<&'static str, AtomicUsize>> = Lazy::new(|| DashMap::new());

#[macro_export]
macro_rules! log_message_throttle {
($tag:expr, $n:expr, $($arg:tt)*) => {{ 
// Get or insert counter 
let counter = $crate::macros::LOG_COUNTERS.entry($tag) 
.or_insert_with(|| AtomicUsize::new(0)); 
let count = counter.fetch_add(1, Ordering::Relaxed); 
if count % $n == 0 { 
use std::fs::OpenOptions; 
use std::io::Write; 
use chrono::Local; 

const LOG_FILE: &str = "/home/debian/documentation/shell/binance/config/monitor_price.log"; 
let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S"); 
let msg = format!($($arg)*); 
let full_msg = format!("[{}] {}\n", timestamp, msg); 

if let Ok(mut file) = OpenOptions::new().append(true).create(true).open(LOG_FILE) { 
let _ = file.write_all(full_msg.as_bytes()); 
} 
println!("{}", full_msg.trim()); 
} 
}};
}

#[macro_export]
macro_rules! log_message { 
($($arg:tt)*) => {{ 
use std::fs::OpenOptions; 
use std::io::Write; 
use chrono::Local; 

const LOG_FILE: &str = "/home/debian/documentation/shell/binance/config/monitor_price.log"; 
let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S"); 
let msg = format!($($arg)*); 
let full_msg = format!("[{}] {}\n", timestamp, msg); 

if let Ok(mut file) = OpenOptions::new().append(true).create(true).open(LOG_FILE) { 
let _ = file.write_all(full_msg.as_bytes()); 
} 
println!("{}", full_msg.trim()); 
}};
}

#[macro_export]
macro_rules! log_throttle { 
($tag:expr, $n:expr, $($arg:tt)*) => {{ 
// Get or insert counter 
let counter = $crate::macros::LOG_COUNTERS.entry($tag) 
.or_insert_with(|| AtomicUsize::new(0)); 
let count = counter.fetch_add(1, Ordering::Relaxed);
if count % $n == 0 {
// You use `info!` here, make sure you have the appropriate logging dependencies and initialization in the macro call
log::info!($($arg)*);
}
}};
}
```
{% endraw %}
---

# Example

```rust
log_message_throttle!("highs", 3, "highs: {:?}", highs);
log_message_throttle!("lows", 3, "lows: {:?}", lows);

log_throttle!("orders", 5, "New order: {:?}", order);
```

---

# Notes

* Both the `log_message_throttle!` and `log_throttle!` macros accept a first argument as a string label to distinguish counters in the global map.
* It will only print when the counter of the corresponding tag meets the throttling condition.
* Share the same global `LOG_COUNTERS`, no need to write static variables for each tag.
* When you use `log_throttle!`, make sure you have initialized the logging library (such as `env_logger::init()` or `tracing_subscriber`), otherwise `log::info!` will not output.

---

Do you need me to write a complete example `main.rs` to demonstrate the call and log initialization?  

这类错误的核心原因是：**宏展开时需要的 `AtomicUsize` 和 `Ordering` 类型必须在宏内部显式引用全路径**，否则在展开到其他模块时，会因为作用域不同而找不到这些类型。

---

### ✅ 修复方式

你只需要把宏中对 `AtomicUsize` 和 `Ordering` 的引用改成 **全路径引用**，比如：

* `AtomicUsize::new(0)` → `std::sync::atomic::AtomicUsize::new(0)`
* `Ordering::Relaxed` → `std::sync::atomic::Ordering::Relaxed`

---

### ✅ 修复后的宏文件（`macros.rs`）
{% raw %}
```rust
use once_cell::sync::Lazy;
use dashmap::DashMap;

pub static LOG_COUNTERS: Lazy<DashMap<&'static str, std::sync::atomic::AtomicUsize>> = Lazy::new(|| DashMap::new());

#[macro_export]
macro_rules! log_message_throttle {
    ($tag:expr, $n:expr, $($arg:tt)*) => {{
        let counter = $crate::macros::LOG_COUNTERS
            .entry($tag)
            .or_insert_with(|| std::sync::atomic::AtomicUsize::new(0));
        let count = counter.fetch_add(1, std::sync::atomic::Ordering::Relaxed);

        if count % $n == 0 {
            use std::fs::OpenOptions;
            use std::io::Write;
            use chrono::Local;

            const LOG_FILE: &str = "/home/debian/文档/shell/binance/config/monitor_price.log";
            let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S");
            let msg = format!($($arg)*);
            let full_msg = format!("[{}] {}\n", timestamp, msg);

            if let Ok(mut file) = OpenOptions::new().append(true).create(true).open(LOG_FILE) {
                let _ = file.write_all(full_msg.as_bytes());
            }
            println!("{}", full_msg.trim());
        }
    }};
}

#[macro_export]
macro_rules! log_message {
    ($($arg:tt)*) => {{
        use std::fs::OpenOptions;
        use std::io::Write;
        use chrono::Local;

        const LOG_FILE: &str = "/home/debian/文档/shell/binance/config/monitor_price.log";
        let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S");
        let msg = format!($($arg)*);
        let full_msg = format!("[{}] {}\n", timestamp, msg);

        if let Ok(mut file) = OpenOptions::new().append(true).create(true).open(LOG_FILE) {
            let _ = file.write_all(full_msg.as_bytes());
        }
        println!("{}", full_msg.trim());
    }};
}

#[macro_export]
macro_rules! log_throttle {
    ($tag:expr, $n:expr, $($arg:tt)*) => {{
        let counter = $crate::macros::LOG_COUNTERS
            .entry($tag)
            .or_insert_with(|| std::sync::atomic::AtomicUsize::new(0));
        let count = counter.fetch_add(1, std::sync::atomic::Ordering::Relaxed);

        if count % $n == 0 {
            log::info!($($arg)*);
        }
    }};
}
```
{% endraw %}
---

### ✅ 你的调用代码可以保持不变：

```rust
log_message_throttle!("h", 3, "highs: {:?}", highs);
log_message_throttle!("l", 3, "lows: {:?}", lows);
```

---

这个修改是 **符合宏使用规范的标准做法**，能够在跨 crate、跨 module 调用时不出错。

如果你还遇到别的宏展开报错，欢迎继续贴出来。

The core reason for this type of error is: **The `AtomicUsize` and `Ordering` types required for macro expansion must be explicitly referenced in the macro with full paths**, otherwise when expanding to other modules, these types will not be found due to different scopes.

---

### ✅ Fix

You just need to change the references to `AtomicUsize` and `Ordering` in the macro to **full path reference**, for example:

* `AtomicUsize::new(0)` → `std::sync::atomic::AtomicUsize::new(0)`
* `Ordering::Relaxed` → `std::sync::atomic::Ordering::Relaxed`

---

### ✅ Fixed macro file (`macros.rs`)
{% raw %}
```rust
use once_cell::sync::Lazy;
use dashmap::DashMap;

pub static LOG_COUNTERS: Lazy<DashMap<&'static str, std::sync::atomic::AtomicUsize>> = Lazy::new(|| DashMap::new());

#[macro_export]
macro_rules! log_message_throttle { 
($tag:expr, $n:expr, $($arg:tt)*) => {{ 
let counter = $crate::macros::LOG_COUNTERS 
.entry($tag) 
.or_insert_with(|| std::sync::atomic::AtomicUsize::new(0)); 
let count = counter.fetch_add(1, std::sync::atomic::Ordering::Relaxed); 

if count % $n == 0 { 
use std::fs::OpenOptions; 
use std::io::Write; 
use chrono::Local; 

const LOG_FILE: &str = "/home/debian/documentation/shell/binance/config/monitor_price.log"; 
let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S"); 
let msg = format!($($arg)*); 
let full_msg = format!("[{}] {}\n", timestamp, msg); 

if let Ok(mut file) = OpenOptions::new().append(true).create(true).open(LOG_FILE) { 
let _ = file.write_all(full_msg.as_bytes()); 
} 
println!("{}", full_msg.trim()); 
} 
}};
}

#[macro_export]
macro_rules! log_message { 
($($arg:tt)*) => {{ 
use std::fs::OpenOptions; 
use std::io::Write; 
use chrono::Local; 

const LOG_FILE: &str = "/home/debian/documentation/shell/binance/config/monitor_price.log"; 
let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S"); 
let msg = format!($($arg)*); 
let full_msg = format!("[{}] {}\n", timestamp, msg); 

if let Ok(mut file) = OpenOptions::new().append(true).create(true).open(LOG_FILE) { 
let _ = file.write_all(full_msg.as_bytes()); 
} 
println!("{}", full_msg.trim()); 
}};
}

#[macro_export]
macro_rules! log_throttle { 
($tag:expr, $n:expr, $($arg:tt)*) => {{
let counter = $crate::macros::LOG_COUNTERS
.entry($tag)
.or_insert_with(|| std::sync::atomic::AtomicUsize::new(0));
let count = counter.fetch_add(1, std::sync::atomic::Ordering::Relaxed);

if count % $n == 0 {
log::info!($($arg)*);
}
}};
}
```
{% endraw %}

---

### ✅ Your calling code can remain the same:

```rust
log_message_throttle!("h", 3, "highs: {:?}", highs);
log_message_throttle!("l", 3, "lows: {:?}", lows);
```

---

This change is **Standard practice that complies with macro usage specifications**, which can avoid errors when calling across crates and modules.

If you encounter other macro expansion errors, please continue to post them. 