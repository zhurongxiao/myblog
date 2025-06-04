---
layout: post
title: "rust Arc Mutex"
date: 2025-06-04 09:24:00 +0800
categories: rust

---



明白了，让我们通过代入具体的数字来一步步解释这个程序的执行过程，并预测每个步骤的结果。假设我们有3个线程而不是10个，以便简化示例分析。

### 修改后的代码（仅用于说明）

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    // 使用 Arc 和 Mutex 包装一个 i32 类型的计数器。
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..3 { // 减少线程数量到3个以简化分析
        let counter_clone = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            let mut num = counter_clone.lock().unwrap();
            *num += 1;
            println!("Counter updated to {}", *num);
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Final counter value: {}", *counter.lock().unwrap());
}
```

### 步骤解析

#### 初始状态
- `counter` 的初始值为 `0`。

#### 线程启动和操作

由于线程的执行顺序是不确定的，我们将考虑一种可能的执行顺序来进行分析。注意实际运行时可能会有所不同，但结果应该是相同的。

1. **第一个线程**
   - 获取 `counter` 的锁并将其值从 `0` 增加到 `1`。
   - 打印 `"Counter updated to 1"`。

2. **第二个线程**
   - 获取 `counter` 的锁并等待第一个线程释放锁（如果第一个线程还没有完成）。
   - 将其值从 `1` 增加到 `2`。
   - 打印 `"Counter updated to 2"`。

3. **第三个线程**
   - 获取 `counter` 的锁并等待前两个线程释放锁（如果它们还没有完成）。
   - 将其值从 `2` 增加到 `3`。
   - 打印 `"Counter updated to 3"`。

#### 最终状态
- 主线程等待所有子线程完成后，获取 `counter` 的最终值并打印出来：`"Final counter value: 3"`。

### 可能的输出示例

根据上述步骤，一个可能的输出结果如下：

```
Counter updated to 1
Counter updated to 2
Counter updated to 3
Final counter value: 3
```

请注意，因为线程调度是由操作系统管理的，所以实际的输出顺序可能会有所不同。例如，有时你可能会看到：

```
Counter updated to 1
Counter updated to 3
Counter updated to 2
Final counter value: 3
```

但是最终的计数值始终会是 `3`，因为每个线程都会对计数器进行一次递增操作。这就是使用 `Mutex` 来确保在多线程环境中安全地访问共享资源的重要性。它保证了每次只有一个线程可以修改数据，从而避免了竞争条件的发生。  

Got it, let's explain the execution of this program step by step by plugging in specific numbers and predict the results of each step. Assume that we have 3 threads instead of 10 to simplify the example analysis.

### Modified code (for illustration only)

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
// Use Arc and Mutex to wrap an i32 type counter.
let counter = Arc::new(Mutex::new(0));
let mut handles = vec![];

for _ in 0..3 { // Reduce the number of threads to 3 to simplify analysis
let counter_clone = Arc::clone(&counter);
let handle = thread::spawn(move || {
let mut num = counter_clone.lock().unwrap();
*num += 1;
println!("Counter updated to {}", *num);
});
handles.push(handle);
}

for handle in handles {
handle.join().unwrap();
}

println!("Final counter value: {}", *counter.lock().unwrap());
}
```

### Step analysis

#### Initial state
- The initial value of `counter` is `0`.

#### Thread startup and operation

Since the execution order of threads is undefined, we will consider one possible execution order for analysis. Note that the actual runtime may be different, but the result should be the same.

1. **First thread**
- Acquires the lock of `counter` and increments its value from `0` to `1`.
- Prints `"Counter updated to 1"`.

2. **Second thread**
- Acquires the lock of `counter` and waits for the first thread to release the lock (if the first thread has not yet completed).
- Increments its value from `1` to `2`.
- Prints `"Counter updated to 2"`.

3. **Third thread**
- Acquires the lock of `counter` and waits for the first two threads to release the lock (if they have not yet completed).
- Increments its value from `2` to `3`.
- Prints `"Counter updated to 3"`.

#### Final state
- After the main thread waits for all child threads to complete, it gets the final value of `counter` and prints it out: `"Final counter value: 3"`.

### Possible output example

Based on the above steps, a possible output result is as follows:

```
Counter updated to 1
Counter updated to 2
Counter updated to 3
Final counter value: 3
```

Note that because thread scheduling is managed by the operating system, the actual output order may be different. For example, sometimes you may see:

```
Counter updated to 1
Counter updated to 3
Counter updated to 2
Final counter value: 3
```

But the final counter value will always be `3` because each thread increments the counter once. This is why it is important to use `Mutex` to ensure safe access to shared resources in a multi-threaded environment. It ensures that only one thread can modify the data at a time, thus avoiding race conditions.