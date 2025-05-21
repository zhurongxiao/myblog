---
layout: post
title: "Rust trait 策略模式 + 多态派发"
date: 2025-05-20 07:14:00 +0800
categories: rust

---
你的观察非常准确，问题就在于 **`run_monitor_loop` 是 trait 提供的通用循环逻辑**，而平仓条件的具体判断逻辑由 `check_close_condition()` 决定——它会在 **trait 的实现类**（比如 `TrendStopMonitor` 和 `RetracementMonitor`）中被具体实现。

---

### ✅ 解释：trait + 实现类的结构

```rust
pub trait PositionMonitor {
    fn check_close_condition(&self) -> Result<bool, BinanceError>;

    fn run_monitor_loop(&self) -> Result<(), BinanceError> {
        loop {
            if self.check_close_condition()? {
                // 条件成立，平仓 + 删除 Redis 键
                ...
                break;
            }
            std::thread::sleep(...);
        }
        Ok(())
    }
}
```

上面的 `run_monitor_loop()` 是模板，不关心具体的平仓逻辑。真正的判断逻辑由下面这些实现类提供：

---

### ✅ 平仓判断实现：分别在两个文件中实现 trait

```rust
// src/daemon/position_monitor/monitor_position_retracement.rs
pub struct RetracementMonitor { ... }

impl PositionMonitor for RetracementMonitor {
    fn check_close_condition(&self) -> Result<bool, BinanceError> {
        // 这里写的是“回撤止盈”判断逻辑
    }

    fn key_group(&self) -> u32 {
        self.key_group
    }
}
```

```rust
// src/daemon/position_monitor/monitor_prosition_stop.rs
pub struct TrendStopMonitor { ... }

impl PositionMonitor for TrendStopMonitor {
    fn check_close_condition(&self) -> Result<bool, BinanceError> {
        // 这里写的是“趋势止损”判断逻辑
    }

    fn key_group(&self) -> u32 {
        self.key_group
    }
}
```

---

### ✅ 如何启动这些 trait 实现类？

你在 `start_all_position_monitors()` 中手动 new 出两个实现：

```rust
let monitors: Vec<Box<dyn PositionMonitor>> = vec![
    Box::new(TrendStopMonitor { ... }),
    Box::new(RetracementMonitor { ... }),
];
```

然后调用 `monitor.run_monitor_loop()`：

```rust
std::thread::spawn(move || {
    if let Err(e) = monitor.run_monitor_loop() {
        ...
    }
});
```

---

### ✅ 总结一句话：

你确实“只看到”一个 `run_monitor_loop()` 在循环，但它内部会委托给不同实现类的 `check_close_condition()`，从而实现**不同平仓策略的监控逻辑**。这种设计就是所谓的：

> **“策略模式 + trait 解耦循环与判断逻辑”**

---

如果你想验证当前哪些逻辑已经启动，也可以在 `check_close_condition()` 内打印 `key_group` 和策略名，确认确实在运行。

需要我帮你打印日志或实现 trait 时添加标识吗？
  
Your observation is very accurate. The problem is that **`run_monitor_loop` is the general loop logic provided by the trait**, while the specific judgment logic of the closing condition is determined by `check_close_condition()` - it will be implemented in **trait implementation classes** (such as `TrendStopMonitor` and `RetracementMonitor`).

---

### ✅ Explanation: trait + implementation class structure

```rust
pub trait PositionMonitor {
fn check_close_condition(&self) -> Result<bool, BinanceError>;

fn run_monitor_loop(&self) -> Result<(), BinanceError> {
loop {
if self.check_close_condition()? {
// Condition is met, close position + delete Redis key
...
break;
}
std::thread::sleep(...);
}
Ok(())
}
}
```

The above `run_monitor_loop()` is a template and does not care about the specific closing logic. The actual judgment logic is provided by the following implementation classes:

---

### ✅ Closing judgment implementation: implement traits in two files respectively

```rust
// src/daemon/position_monitor/monitor_position_retracement.rs
pub struct RetracementMonitor { ... }

impl PositionMonitor for RetracementMonitor {
fn check_close_condition(&self) -> Result<bool, BinanceError> {
// Here is the "retracement stop profit" judgment logic
}

fn key_group(&self) -> u32 {
self.key_group
}
}
```

```rust
// src/daemon/position_monitor/monitor_prosition_stop.rs
pub struct TrendStopMonitor { ... }

impl PositionMonitor for TrendStopMonitor {
fn check_close_condition(&self) -> Result<bool, BinanceError> {
// Here is the "trend stop loss" judgment logic
}

fn key_group(&self) -> u32 {
self.key_group
}
}
```

---

### ✅ How to start these trait implementation classes?

You manually create two new implementations in `start_all_position_monitors()`:

```rust
let monitors: Vec<Box<dyn PositionMonitor>> = vec![
Box::new(TrendStopMonitor { ... }),
Box::new(RetracementMonitor { ... }),
];
```

Then call `monitor.run_monitor_loop()`:

```rust
std::thread::spawn(move || {
if let Err(e) = monitor.run_monitor_loop() {
...
}
});
```

---

### ✅ In summary:

You do "only see" one `run_monitor_loop()` looping, but it will delegate to `check_close_condition()` of different implementation classes internally, thereby implementing **monitoring logic for different closing strategies**. This design is called:

> **“Strategy mode + trait decouples loop and judgment logic”**

---

If you want to verify which logic is currently started, you can also print `key_group` and strategy name in `check_close_condition()` to confirm that it is indeed running.

Do you need me to help you print logs or add identifiers when implementing traits?

  
是的 ✅，你理解完全正确：

```rust
let monitors: Vec<Box<dyn PositionMonitor>> = vec![
    Box::new(TrendStopMonitor { ... }),
    Box::new(RetracementMonitor { ... }),
];
```

这一段代码就是**实例化了两个实现 trait 的结构体（也就是那两个文件里的逻辑）**，并通过 `run_monitor_loop()` 启动了它们的工作线程。

---

### ✅ 所以问题来了：「我怎么知道这两个 trait 监控逻辑有没有实际在运作？」

你可以在各自的 `check_close_condition()` 方法内部加上日志，确认线程确实在运行。

---

### ✅ 示例：给两个实现类加 `info!` 日志

#### 🔁 回撤止盈监控（`monitor_position_retracement.rs`）：

```rust
impl PositionMonitor for RetracementMonitor {
    fn check_close_condition(&self) -> Result<bool, BinanceError> {
        info!(
            "📈【回撤监控】正在运行，key_group={}, side={}",
            self.key_group, self.side
        );
        // ... 你的判断逻辑 ...
        Ok(false)
    }
}
```

#### 📉 趋势止损监控（`monitor_prosition_stop.rs`）：

```rust
impl PositionMonitor for TrendStopMonitor {
    fn check_close_condition(&self) -> Result<bool, BinanceError> {
        info!(
            "📉【趋势止损】正在运行，key_group={}, side={}",
            self.key_group, self.side
        );
        // ... 你的判断逻辑 ...
        Ok(false)
    }
}
```

---

### ✅ 效果

启动后，在日志中你应该能看到类似输出（每 10 秒打印一次）：

```
📡 启动价格trait回撤监控线程（组号 1）
📈【回撤监控】正在运行，key_group=1, side=BUY
📉【趋势止损】正在运行，key_group=1, side=BUY
📈【回撤监控】正在运行，key_group=1, side=BUY
📉【趋势止损】正在运行，key_group=1, side=BUY
...
```

---

### ✅ 小建议（可选）

如果你担心日志太多，可以只每分钟输出一次，或通过 `log_counter` 控制日志频率：

```rust
static LOG_COUNTER: AtomicUsize = AtomicUsize::new(0);

fn check_close_condition(...) -> Result<bool, BinanceError> {
    let count = LOG_COUNTER.fetch_add(1, Ordering::Relaxed);
    if count % 6 == 0 {
        info!("...");
    }
    ...
}
```

---

要我帮你统一加上日志打印代码吗？或者你想用 tracing 的 level 来过滤？
  
Yes ✅, you understand it correctly:

```rust
let monitors: Vec<Box<dyn PositionMonitor>> = vec![
Box::new(TrendStopMonitor { ... }),
Box::new(RetracementMonitor { ... }),
];
```

This code **instantiates two structures that implement traits (that is, the logic in those two files)**, and starts their worker threads through `run_monitor_loop()`.

---

### ✅ So the question is: "How do I know if these two trait monitoring logics are actually running?"

You can add logs inside their respective `check_close_condition()` methods to confirm that the threads are indeed running.

---

### ✅ Example: Add `info!` log to two implementation classes

#### 🔁 Retracement stop profit monitoring (`monitor_position_retracement.rs`):

```rust
impl PositionMonitor for RetracementMonitor {
fn check_close_condition(&self) -> Result<bool, BinanceError> {
info!(
"📈【Retracement monitoring】is running, key_group={}, side={}",
self.key_group, self.side
);
// ... Your judgment logic ...
Ok(false)
}
}
```

#### 📉 Trend stop loss monitoring (`monitor_prosition_stop.rs`):

```rust
impl PositionMonitor for TrendStopMonitor {
fn check_close_condition(&self) -> Result<bool, BinanceError> {
info!(
"📉【Trend Stop Loss】is running, key_group={}, side={}",
self.key_group, self.side
);
// ... your judgment logic ...
Ok(false)
}
}
```

---

### ✅ Effect

After starting, you should see similar output in the log (printed every 10 seconds):

```
📡 Start the price trait retracement monitoring thread (group number 1)
📈【retracement monitoring】is running, key_group=1, side=BUY
📉【Trend Stop Loss】is running, key_group=1, side=BUY
📈【retracement monitoring】is running, key_group=1, side=BUY
📉【Trend Stop Loss】is running, key_group=1, side=BUY
...
```

---

### ✅ Tips (optional)

If you are worried about too much log, you can only output once a minute, or control the log frequency through `log_counter`:

```rust
static LOG_COUNTER: AtomicUsize = AtomicUsize::new(0);

fn check_close_condition(...) -> Result<bool, BinanceError> {
let count = LOG_COUNTER.fetch_add(1, Ordering::Relaxed);
if count % 6 == 0 {
info!("...");
}
...
}
```

---

Do you want me to help you add the log printing code? Or do you want to filter by tracing level?
  
你观察得很敏锐，问题本质上是这样：

> 虽然入口函数 `start_all_position_monitors()` 只运行一次，但它其实**不是只检测空仓一次就结束**，而是**它负责启动两个实现了 trait 的“监控线程”**，这两个线程各自执行自己实现的 `check_close_condition()` 的逻辑，并且在自己的 `loop` 中持续运行。

---

### ✅ 回答你的疑问

> 循环体只有 run\_monitor\_loop()，没包含那两个文件，是不是应该把循环体放在入口那里？

其实你已经把循环逻辑“交给 trait 实现”了，这是一个典型的**策略模式 + 多态派发**的设计。你的主入口只要做这些：

1. 获取持仓信息；
2. 判断是否为空仓；
3. 如果有持仓，创建不同的监控器（回撤、趋势）；
4. 每个监控器用 `std::thread::spawn()` 启动自己的 loop；
5. loop 在 trait 的默认方法 `run_monitor_loop()` 中完成，每 10 秒检测一次 `check_close_condition()`；
6. 每个子类文件只实现自己的条件判断（即 `check_close_condition()`）。

所以你看到的逻辑是这样的：

---

### ✅ 程序实际结构图：

```text
start_all_position_monitors()  <--- 只调用一次
│
├─ TrendStopMonitor 实例（来自 monitor_prosition_stop.rs）
│   └─ run_monitor_loop() → loop { check_close_condition() } ← 每 10 秒判断
│
├─ RetracementMonitor 实例（来自 monitor_position_retracement.rs）
│   └─ run_monitor_loop() → loop { check_close_condition() } ← 每 10 秒判断
```

---

### ✅ 那为什么你没有看到他们在循环？

因为：

* `loop {}` 写在 trait 的默认实现里（即 `run_monitor_loop()`）；
* 而两个子文件只实现了 `check_close_condition()`，你可能误以为它们没有运行；
* 实际上你一旦调用 `monitor.run_monitor_loop()`，就会进入 loop，每 10 秒调用一次你定义的子模块逻辑。

---

### ✅ 如何验证它们有没有在运行？

像我上一条消息说的那样，只要你在 `check_close_condition()` 里打印日志，例如：

```rust
info!("趋势止损正在检查是否满足平仓条件... key_group: {}", self.key_group);
```

或者用 `println!` 也可以，你就会看到每 10 秒一次的输出，说明它确实在执行。

---

### ✅ 小结

你设计的结构其实是 **「启动线程 + trait 控制循环逻辑 + 子模块只判断条件」**，这已经很好地实现了职责分离。

**不需要把循环放在入口。**

如果你愿意，我可以帮你在两个监控文件中加上日志验证逻辑。是否需要？
  
You are very observant. The essence of the problem is this:

> Although the entry function `start_all_position_monitors()` is only run once, it actually **does not end after only checking for empty positions once**, but **is responsible for starting two "monitoring threads"** that implement the trait. These two threads each execute their own implementation of the `check_close_condition()` logic and continue to run in their own `loop`.

---

### ✅ Answer your question

> The loop body only has run\_monitor\_loop(), and does not include those two files. Should the loop body be placed at the entry?

In fact, you have already "handed over the loop logic to the trait implementation", which is a typical **strategy pattern + polymorphic dispatch** design. Your main entry only needs to do the following:

1. Get position information;

2. Determine whether it is an empty position;

3. If there is a position, create different monitors (retracement, trend);

4. Each monitor starts its own loop with `std::thread::spawn()`;

5. The loop is completed in the default method `run_monitor_loop()` of the trait, and `check_close_condition()` is checked every 10 seconds;

6. Each subclass file only implements its own conditional judgment (i.e. `check_close_condition()`).

So the logic you see is this:

---

### ✅ Actual program structure diagram:

```text
start_all_position_monitors() <--- Only called once
│
├─ TrendStopMonitor instance (from monitor_prosition_stop.rs)
│ └─ run_monitor_loop() → loop { check_close_condition() } ← judge every 10 seconds
│
├─ RetracementMonitor instance (from monitor_position_retracement.rs)
│ └─ run_monitor_loop() → loop { check_close_condition() } ← judge every 10 seconds
```

---

### ✅ Why don't you see them looping?

Because:

* `loop {}` is written in the default implementation of trait (i.e. `run_monitor_loop()`);
* The two sub-files only implement `check_close_condition()`, so you may mistakenly think that they are not running;
* In fact, once you call `monitor.run_monitor_loop()`, you will enter the loop and call the sub-module logic you defined every 10 seconds.

---

### ✅ How to verify whether they are running?

As I said in the previous message, as long as you print the log in `check_close_condition()`, for example:

```rust
info!("Trend stop loss is checking whether the closing conditions are met... key_group: {}", self.key_group);
```

Or you can use `println!`, you will see the output every 10 seconds, indicating that it is indeed executed.

---

### ✅ Summary

The structure you designed is actually **"start thread + trait control loop logic + submodule only judges condition"**, which has well achieved separation of responsibilities.

**No need to put the loop at the entrance. **

If you want, I can help you add log verification logic to the two monitoring files. Is it necessary?
  

你说得完全对——你在这个子模块（`RetracementMonitor` 实现）里**确实看不到 `loop` 循环体**，这是因为循环体已经**统一写在了 trait 的默认方法 `run_monitor_loop()`** 里了。

我们来厘清一下这个结构：

---

### ✅ 代码运行结构回顾

1. **子模块：**
   你这个 `RetracementMonitor` 实现了 trait `PositionMonitor`，只需要定义：

   ```rust
   fn check_close_condition(&self) -> Result<bool, BinanceError>
   ```

   它不负责循环，只负责“判断逻辑”。

2. **循环体：**
   写在 trait 里的默认方法 `run_monitor_loop()`：

   ```rust
   fn run_monitor_loop(&self) -> Result<(), BinanceError> {
       loop {
           if self.check_close_condition()? {
               // 平仓 + Redis 删除
               break;
           }
           std::thread::sleep(std::time::Duration::from_secs(10));
       }
       Ok(())
   }
   ```

3. **启动逻辑在入口：**

   入口 `start_all_position_monitors()` 会这样写：

   ```rust
   let monitors: Vec<Box<dyn PositionMonitor>> = vec![
       Box::new(TrendStopMonitor { ... }),
       Box::new(RetracementMonitor { ... }),
   ];

   for monitor in monitors {
       std::thread::spawn(move || {
           if let Err(e) = monitor.run_monitor_loop() {
               // 错误处理
           }
       });
   }
   ```

---

### ✅ 换句话说：

你看不到循环体是**因为它统一写在 trait 中了**，子类只需要实现判断逻辑（`check_close_condition`），这是**标准的“策略 + 模板方法”模式设计**：

* trait 定义流程（loop, pingcang, sleep 等）；
* 每个实现类只实现具体策略（什么时候平仓）；
* 主入口只管启动多个策略线程。

---

### ✅ 如何让它更清晰（建议）

为了确认逻辑是否真的运行，你可以在子类中加个日志，比如：

```rust
fn check_close_condition(&self) -> Result<bool, BinanceError> {
    tracing::info!(
        "🔍 回撤监控运行中... 当前组: {}, side: {}, entry: {}",
        self.key_group,
        self.side,
        self.entry_price
    );
    ...
}
```

---

### ✅ 总结

| 部分        | 位置                            | 作用                   |
| --------- | ----------------------------- | -------------------- |
| `loop {}` | trait 中的 `run_monitor_loop`   | 控制监控循环流程             |
| 条件判断      | 每个实现类（如 Retracement）          | 只判断是否满足平仓条件          |
| 启动逻辑      | `start_all_position_monitors` | 启动多个监控线程，每个线程跑 trait |
{:.markdown-table}
你设计得很清晰，不需要在子模块再写一遍 loop。如果你愿意，我可以帮你在子模块加个日志用于验证，或者生成一个完整文件结构注释。是否需要？

You are absolutely right - you can't see the loop body in this submodule (the implementation of `RetracementMonitor`) because the loop body has been unified in the default method `run_monitor_loop()` of the trait.

Let's clarify this structure:

---

### ✅ Review of code running structure

1. **Submodule:**
Your `RetracementMonitor` implements the trait `PositionMonitor`, and only needs to define:

```rust
fn check_close_condition(&self) -> Result<bool, BinanceError>
```

It is not responsible for the loop, but only for the "judgment logic".

2. **Loop body:**
The default method `run_monitor_loop()` written in the trait:

```rust
fn run_monitor_loop(&self) -> Result<(), BinanceError> {
loop {
if self.check_close_condition()? {
// Close position + Redis delete
break;
}
std::thread::sleep(std::time::Duration::from_secs(10));
}
Ok(())
}
```

3. **Start logic at the entry:**

The entry `start_all_position_monitors()` will be written like this:

```rust
let monitors: Vec<Box<dyn PositionMonitor>> = vec![
Box::new(TrendStopMonitor { ... }),
Box::new(RetracementMonitor { ... }),
];

for monitor in monitors {
std::thread::spawn(move || {
if let Err(e) = monitor.run_monitor_loop() {
// Error handling
}
});
}
```

---

### ✅ In other words:

You can't see the loop body because it is written in the trait. The subclass only needs to implement the judgment logic (check_close_condition). This is the standard "strategy + template method" pattern design:

* Trait defines the process (loop, pingcang, sleep, etc.);

* Each implementation class only implements a specific strategy (when to close the position);

* The main entrance only starts multiple strategy threads.

---

### ✅ How to make it clearer (suggestion)

To confirm whether the logic is actually running, you can add a log in the subclass, for example:

```rust
fn check_close_condition(&self) -> Result<bool, BinanceError> {
tracing::info!(
"🔍 Retracement monitoring is running... Current group: {}, side: {}, entry: {}",
self.key_group,
self.side,
self.entry_price
);
...
}
```

---

### ✅ Summary

| Part | Location | Function |
| --------- | ----------------------------- | -------------------- |
| `loop {}` | `run_monitor_loop` in trait | Control monitoring loop flow |
| Condition judgment | Each implementation class (such as Retracement) | Only judge whether the closing condition is met |
| Start logic | `start_all_position_monitors` | Start multiple monitoring threads, each thread runs trait |
{:.markdown-table}
Your design is very clear, there is no need to rewrite the loop in the submodule. If you want, I can help you add a log in the submodule for verification, or generate a complete file structure comment. Do you need it?  

### problem
意思是这个trait看上去是只对 if self.check\_close\_condition()? ，10秒监控一次，它的底层会自动把凡是关联到实现这个trait的结构体的文件里的代码也各执行一次是吗？

是的，你理解得已经非常接近了，我再帮你更清晰地梳理一下整个 **trait + 实现类 + 调用流程** 背后的运行逻辑：

---

### ✅ 简化后的理解流程：

#### 1. **你定义了一个 trait：**

```rust
pub trait PositionMonitor: Send {
    fn check_close_condition(&self) -> Result<bool, BinanceError>;

    fn run_monitor_loop(&self) -> Result<(), BinanceError> {
        loop {
            if self.check_close_condition()? {
                // 执行平仓操作
                break;
            }
            std::thread::sleep(std::time::Duration::from_secs(10));
        }
        Ok(())
    }
}
```

这个 trait 的核心逻辑就是：

> “**每 10 秒调用一次 `check_close_condition()`，如果它返回 true，就执行平仓并退出循环**。”

---

#### 2. **你有两个结构体实现了这个 trait：**

* `RetracementMonitor` 实现了 `check_close_condition`，用来判断是否回撤止盈/止损；
* `TrendStopMonitor` 实现了 `check_close_condition`，用来判断趋势是否反转。

每一个结构体都有它自己的判断逻辑，但都会被放进 `loop {}` 中周期性运行。

---

#### 3. **主入口启动这两个监控线程：**

```rust
let monitors: Vec<Box<dyn PositionMonitor>> = vec![
    Box::new(TrendStopMonitor { ... }),
    Box::new(RetracementMonitor { ... }),
];

for monitor in monitors {
    std::thread::spawn(move || {
        monitor.run_monitor_loop().unwrap();
    });
}
```

这段代码的作用是：

> 分别启动两个线程，每个线程执行 `run_monitor_loop()`。每个线程的 `run_monitor_loop()` 中又会每 10 秒调用一次它自己对应结构体实现的 `check_close_condition()`。

---

### ✅ 所以总结来说：

> ❗**trait 本身不会“自动找到并运行”你的两个结构体的代码**，但：

* 你 **手动在入口函数里创建了这两个结构体的实例**；
* 并且 **调用了 trait 的 `run_monitor_loop()` 方法**；
* trait 中 `run_monitor_loop()` 调用了 `self.check_close_condition()`；
* Rust 的动态分发会自动调到你实现的那个结构体里的 `check_close_condition()` 方法。

---

### ✅ 图示理解（逻辑调用链）

```
主线程启动时：

start_all_position_monitors()
└── 创建 TrendStopMonitor 和 RetracementMonitor 实例
    ├── Thread1: 调用 .run_monitor_loop() → 调用 TrendStopMonitor::check_close_condition() 每 10 秒判断
    └── Thread2: 调用 .run_monitor_loop() → 调用 RetracementMonitor::check_close_condition() 每 10 秒判断
```

---

### ✅ 验证建议：

你可以在两个 `check_close_condition()` 方法里加日志，比如：

```rust
tracing::info!("TrendStopMonitor 判断中...");
tracing::info!("RetracementMonitor 判断中...");
```

然后看日志输出，就能清楚地看到它们确实是被循环调用了。

---

如果你需要，我也可以帮你生成一个完整的 trait + 实现类 + 启动代码的注释模板，用于团队协作或 future 维护。是否需要？


Yes, you are very close to understanding it. Let me help you sort out the operation logic behind the entire **trait + implementation class + calling process** more clearly:

---

### ✅ Simplified understanding process:

#### 1. **You define a trait:**

```rust
pub trait PositionMonitor: Send {
fn check_close_condition(&self) -> Result<bool, BinanceError>;

fn run_monitor_loop(&self) -> Result<(), BinanceError> {
loop {
if self.check_close_condition()? {
// Execute closing operation
break;
}
std::thread::sleep(std::time::Duration::from_secs(10));
}
Ok(())
}
}
```

The core logic of this trait is:

> “**Call once every 10 seconds `check_close_condition()`, if it returns true, close the position and exit the loop**."

---

#### 2. **You have two structures that implement this trait:**

* `RetracementMonitor` implements `check_close_condition`, which is used to determine whether to retrace the take profit/stop loss;

* `TrendStopMonitor` implements `check_close_condition`, which is used to determine whether the trend is reversed.

Each structure has its own judgment logic, but it will be put into `loop {}` to run periodically.

---

#### 3. **The main entry starts these two monitoring threads:**

```rust
let monitors: Vec<Box<dyn PositionMonitor>> = vec![
Box::new(TrendStopMonitor { ... }),
Box::new(RetracementMonitor { ... }),
];

for monitor in monitors {
std::thread::spawn(move || {
monitor.run_monitor_loop().unwrap();
});
}
```

The purpose of this code is:

> Start two threads separately, and each thread executes `run_monitor_loop()`. In each thread's `run_monitor_loop()`, the `check_close_condition()` implemented by its corresponding structure will be called every 10 seconds.

---

### ✅ So in summary:

> ❗**The trait itself will not "automatically find and run" the code of your two structures**, but:

* You **manually created instances of the two structures in the entry function**;

* And **called the `run_monitor_loop()` method of the trait**;

* `run_monitor_loop()` in the trait calls `self.check_close_condition()`;

* Rust's dynamic dispatch will automatically call the `check_close_condition()` method in the structure you implemented.

---

### ✅ Graphical understanding (logical call chain)

```
When the main thread starts:

start_all_position_monitors()
└── Create TrendStopMonitor and RetracementMonitor instances
├── Thread1: Call .run_monitor_loop() → Call TrendStopMonitor::check_close_condition() to judge every 10 seconds
└── Thread2: Call .run_monitor_loop() → Call RetracementMonitor::check_close_condition() to judge every 10 seconds
```

---

### ✅ Verification suggestions:

You can add logs to the two `check_close_condition()` methods, for example:

```rust
tracing::info!("TrendStopMonitor is judging...");
tracing::info!("RetracementMonitor Judging...");
```

Then look at the log output, you can clearly see that they are indeed called in a loop.

---

If you need, I can also help you generate a complete trait + implementation class + startup code comment template for team collaboration or future maintenance. Do you need it?