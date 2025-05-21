---
layout: post
title: "Rust and_then"
date: 2025-05-12 07:24:00 +0800
categories: rust 

---

很好！我们继续看 `.and_then` 的用法，它是 `.map` 的进阶版，用于“嵌套”场景，即：

* `.map`：闭包返回的是一个值（比如 `i32`）
* `.and_then`：闭包返回的是一个 `Option<T>` 或 `Result<T, E>`，用于继续链式处理

---

## ✅ `Result` 示例（推荐掌握）

```rust
fn get_number() -> Result<i32, String> {
    Ok(10)
}

fn add_five_if_even(n: i32) -> Result<i32, String> {
    if n % 2 == 0 {
        Ok(n + 5)
    } else {
        Err("不是偶数".to_string())
    }
}

fn main() {
    let result = get_number()
        .and_then(add_five_if_even)
        .map_err(|e| format!("处理失败: {}", e));

    println!("{:?}", result); // Ok(15)
}
```

### ✅ 如果换成奇数：

```rust
fn get_number() -> Result<i32, String> {
    Ok(11)
}
```

输出：

```
Err("处理失败: 不是偶数")
```

---

## ✅ 类比 `.map` 和 `.and_then`

```rust
// .map 示例：只改变内部值
Ok(2).map(|n| n + 1); // Ok(3)

// .and_then 示例：进一步调用返回 Result 的函数
Ok(2).and_then(|n| if n > 1 { Ok(n * 2) } else { Err("太小") }); // Ok(4)
```

---

## ✅ `Option` 中的 and\_then

```rust
fn get_optional() -> Option<i32> {
    Some(4)
}

fn double_if_even(n: i32) -> Option<i32> {
    if n % 2 == 0 {
        Some(n * 2)
    } else {
        None
    }
}

fn main() {
    let result = get_optional().and_then(double_if_even);
    println!("{:?}", result); // Some(8)
}
```

---

是否想用你实际的 Redis 读取例子改写成 `.and_then()` 的风格？我可以帮你重构下。


