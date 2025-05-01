---
layout: post
title: "rust &str and String"
date: 2025-05-01 23:35:00 +0800
categories: rust 

---


# Rust 中 `String` 与 `&str` 的区别与使用

在 Rust 中，`String` 与 `&str` 都表示字符串类型，但它们的语义和使用场景有显著不同。本文整理了它们的核心区别以及如何在函数中合理使用，便于今后查阅。

---

## ✅ `&str` 是字符串切片，通常作为函数参数首选

```rust
fn greet(name: &str) {
    println!("Hello, {}!", name);
}

fn main() {
    let owned = String::from("Alice");
    let borrowed = "Bob";

    greet(&owned);   // ✅ String 自动转换为 &str
    greet(borrowed); // ✅ 字面量本身就是 &str
}
```

### 优点：
- 支持传入 `&String` 或 `&str`
- 不复制数据，避免不必要的内存分配
- 更高效，适用于只读场景

---

## ⚠️ `String` 是拥有所有权的字符串对象

```rust
fn greet_owned(name: String) {
    println!("Hello, {}!", name);
}

fn main() {
    let name = String::from("Charlie");
    greet_owned(name); // ✅ name 的所有权被移动

    // println!("{}", name); // ❌ 编译错误，name 已被移动
}
```

### 缺点：
- 所有权转移，原变量失效
- 只能传入 `String`，不接受 `&str`
- 除非确实需要修改或存储，否则不推荐

---

## ✅ 总结建议

| 特性         | `&str`（字符串切片）          | `String`（拥有所有权）        |
|--------------|-------------------------------|-------------------------------|
| 所有权       | 不拥有                        | 拥有                          |
| 是否可变     | 不可变                        | 可变                          |
| 存储位置     | 栈或引用堆内存                 | 堆                            |
| 推荐用途     | 函数参数、只读场景             | 创建、修改、存储字符串数据    |

### ✨ 推荐：**函数参数优先使用 `&str`，除非必须拥有所有权。**





