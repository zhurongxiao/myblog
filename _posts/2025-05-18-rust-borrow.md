---
layout: post
title: "Rust borrow"
date: 2025-05-18 09:45:00 +0800
categories: rust

---

是的，你的理解完全正确！我们来总结一下最佳实践：  
Yes, you understand it exactly! Let's summarize the best practices

### 1. **Basic types (`u32`/`u64`/`i32`/`f64`/`bool`/`char`, etc.)**

   - **直接传值**（因为它们实现了 `Copy`，复制成本极低）
   - 例如：  
   -  **Directly pass values** (because they implement `Copy`, the copying cost is extremely low)
   - For example:
     ```rust
     fn foo(x: u32) {}  // 直接传值
     let num = 42;
     foo(num);  // 复制，不会移动
     foo(num);  // 可以多次调用
     ```

### 2. **`String`、`Vec`、自定义结构体（非 `Copy` 类型）**
   - **优先借用（`&str`/`&[T]`/`&T`）**（避免不必要的克隆）
   - 例如：  
  
### 2. **`String`, `Vec`, custom structures (non `Copy` types)**
- **Prefer borrowing (`&str`/`&[T]`/`&T`)** (avoid unnecessary cloning)
- For example
     ```rust
     fn foo(s: &str, v: &[f64]) {}  // 借用
     let s = String::from("hello");
     let v = vec![1.0, 2.0];
     foo(&s, &v);  // 借用，所有权仍保留
     foo(&s, &v);  // 可重复借用
     ```

### 3. **需要修改数据时**
   - 用可变借用（`&mut T`）：  
   - 
### 3. **When data needs to be modified**
- Use mutable borrow (`&mut T`):
     ```rust
     fn modify(v: &mut Vec<f64>) {
         v.push(3.0);
     }
     let mut prices = vec![1.0, 2.0];
     modify(&mut prices);  // 可变借用
     ```

### 4. **需要所有权时（如存入结构体或线程）**
   - 直接传值 + 必要时调用 `.clone()`：  
### 4. **When ownership is needed (such as storing in a structure or thread)**
- Pass the value directly + call `.clone()` if necessary:
     ```rust
     struct Processor { data: String }
     fn new_processor(data: String) -> Processor {
         Processor { data }  // 需要所有权
     }
     let s = String::from("data");
     let p = new_processor(s.clone());  // 显式克隆
     ```

---

### Correctness analysis of your code
```rust
fn analyze_trend(key: &str, key_group: u32) -> Result<(), BinanceError> {
    let prices: Vec<f64> = RedisUtil::lrange(key, -1440, -1)?;  // prices 是 Vec

    // key_group: u32 → 直接传值（Copy）
    retrcements_rebounds(key_group, &prices)?;  // &prices 借用 Vec
    untie_trend(key_group)?;                    // key_group 复制
    variance_std_dev(key_group, &prices)?;      // &prices 再次借用

    Ok(())
}
```
- **`key_group: u32`**：直接传值（高效复制）。
- **`&prices`**：借用 `Vec`（避免复制大数据）。
- **`key: &str`**：借用字符串（比 `String` 更灵活）  
  <br>
- **`key_group: u32`**: pass value directly (efficient copy).
- **`&prices`**: borrow `Vec` (avoid copying large data).
- **`key: &str`**: borrow string (more flexible than `String`).

---

### Why is it designed like this?
- **性能**：基本类型复制比借用更快（`u32` 复制只需 4 字节拷贝，而借用需要指针解引用）。
- **Performance**: Copying primitive types is faster than borrowing
- **清晰性**：`Copy` 类型直接传值更直观，非 `Copy` 类型用借用明确所有权。
- **Clarity**: `Copy` type directly passes the value more intuitively
- **安全**：Rust 的借用检查器会确保没有悬垂引用。
- **Safety**: Rust's borrow checker ensures there are no dangling references.

Your code already follows Rust best practices! 🚀

### problem
- 如果是可变借用的话，例如是A函数的数据被B函数借用后修改，此时A函数的数据会同步修改吗?

是的！在 Rust 中，**可变借用（`&mut T`）** 允许被借用方（B 函数）修改数据，并且这些修改会**直接反映到原数据（A 函数中的变量）**，因为 Rust 的可变借用是直接操作原始数据的引用。  
<br>
Yes! In Rust, **mutable borrow (`&mut T`)** allows the borrower (B function) to modify the data, and these modifications will be **directly reflected in the original data (the variable in A function)**, because Rust's mutable borrow is a reference to the original data directly operated.

---

## 📌 Key Behaviors of Mutable Borrowing
### 1. **可变借用会同步修改原数据**
### 1. **Mutable borrowing will modify the original data synchronously**
```rust
fn main() {
    let mut data = vec![1, 2, 3];  // A 函数（或作用域）的数据
    
    modify_data(&mut data);         // B 函数可变借用并修改
    
    println!("{:?}", data);        // 输出: [1, 2, 3, 4]（已被修改）
}

fn modify_data(v: &mut Vec<i32>) {  // B 函数接收可变借用
    v.push(4);                      // 修改直接影响原数据
}
```
- **`data` 在 `modify_data` 中被修改后，`main` 中的 `data` 也会同步变化**。
<br>
- **After `data` is modified in `modify_data`, `data` in `main` will also change synchronously**.

### 2. **可变借用的排他性**
### 2. **Exclusiveness of Mutable Borrowing**
Rust 的所有权规则保证：  

Rust's ownership rules ensure that:
- **同一时间只能有一个可变借用**（不能同时有多个 `&mut`）。
- **可变借用期间，原数据不能被其他代码访问**（防止数据竞争）。  
  <br>
  - **Only one mutable borrow can be used at a time** (you cannot have multiple `&mut` at the same time).
- **During a mutable borrow, the original data cannot be accessed by other code** (to prevent data contention).

```rust
let mut x = 42;
let r1 = &mut x;
// let r2 = &mut x;  // 错误！同一时间只能有一个 &mut
// println!("{}", x); // 错误！x 正在被可变借用
```

---

## 🔄 可变借用 vs 不可变借用
## 🔄 Mutable vs. Immutable Borrows

| 行为                | 可变借用 (`&mut T`)       | 不可变借用 (`&T`)         |
|---------------------|--------------------------|--------------------------|
| **能否修改数据**     | ✅ 可以                  | ❌ 不能                  |
| **能否多次借用**     | ❌ 同一时间只能有一个     | ✅ 可以同时有多个        |
| **原数据是否同步修改** | ✅ 是                   | ❌ 否                    |
{:.markdown-table}
---

## 🛠 可变借用的典型使用场景
## 🛠 Typical use cases for mutable borrowing
### 1. **函数内部修改外部数据**
### 1. **Modify external data inside the function**
```rust
fn add_item(list: &mut Vec<String>, item: String) {
    list.push(item);  // 修改直接影响外部数据
}
```

### 2. **跨作用域修改数据**
### 2. **Modify data across scopes**
```rust
let mut score = 100;
{
    let score_ref = &mut score;
    *score_ref -= 20;  // 修改 score
}
println!("{}", score); // 输出: 80
```

### 3. **结构体方法修改自身**
### 3. **Structure method modifies itself**
```rust
impl Player {
    fn take_damage(&mut self, damage: u32) {
        self.health -= damage;  // 修改结构体字段
    }
}
```

---

## ⚠️ 常见错误
### 错误示例：违反借用规则  

## ⚠️ Common Mistakes
### Example of Mistake: Violating Borrowing Rules
```rust
let mut items = vec!["a", "b"];
let first = &items[0];       // 不可变借用
items.push("c");             // 错误！同时存在不可变借用和可变借用
// println!("{}", first);    // 如果 push 能运行，first 可能指向无效内存
```
Rust 会阻止这种操作，因为：
1. `first` 是不可变借用，预期数据不被修改。
2. `push` 需要可变借用，可能触发内存重新分配，导致 `first` 悬垂。  
<br>   
Rust will prevent this operation because:
1. `first` is an immutable borrow and the data is not expected to be modified.
2. `push` requires a mutable borrow and may trigger memory reallocation, causing `first` to dangle.

---

## ✅ 总结
- **可变借用 (`&mut T`) 会直接修改原数据**，所有持有该数据引用的地方都会看到变更。
- Rust 通过严格的借用检查确保：
  - 可变借用的排他性（无数据竞争）。
  - 修改的同步性（原数据始终有效）。
- 设计函数时：
  - 如果函数需要修改输入数据，用 `&mut T`。
  - 如果只是读取，用 `&T`。
  - 如果是 `Copy` 类型（如 `u32`），直接传值更高效。

你的理解完全正确！ 🎉  
<br>
## ✅ Summary
- **Mutable borrow (`&mut T`) will modify the original data directly**, and all places holding references to the data will see the changes.
- Rust ensures through strict borrow checking:
- Exclusivity of mutable borrows (no data competition).
- Synchronization of modifications (the original data is always valid).
- When designing functions:
- If the function needs to modify the input data, use `&mut T`.
- If it is just reading, use `&T`.
- If it is a `Copy` type (such as `u32`), it is more efficient to pass the value directly.

Your understanding is completely correct! 🎉
