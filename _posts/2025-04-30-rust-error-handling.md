---
layout: post
title: "Rust错误类型处理完全指南"
date: 2025-04-30 10:43:45 +0800
categories: rust error-handling
author: YourName
---

# Rust 错误类型处理理解指南

## ✅ 情况一：未加 chrono::ParseError 到枚举，直接用 ?（编译失败）

``` rust
use thiserror::Error;
use chrono::NaiveDateTime;

#[derive(Error, Debug)]
pub enum MyError {
    #[error("API 错误: {0}")]
    ApiError(String),
}

fn parse_time_fail() -> Result<(), MyError> {
    let _dt = NaiveDateTime::parse_from_str("invalid", "%Y-%m-%d %H:%M:%S")?; // ❌ 编译失败
    Ok(())
}
    
```

❗ 编译错误：the trait `From<chrono::ParseError>` is not implemented for `MyError`

## ✅ 情况二：手动 .map_err(\...) 包装

``` rust
fn parse_time_manual() -> Result<(), MyError> {
    let _dt = NaiveDateTime::parse_from_str("invalid", "%Y-%m-%d %H:%M:%S")
        .map_err(|e| MyError::ApiError(format!("解析时间失败: {}", e)))?;
    Ok(())
}
    
```

## ✅ 情况三：在枚举里添加 #\[from\] 实现支持

``` rust
#[derive(Error, Debug)]
pub enum MyError {
    #[error("API 错误: {0}")]
    ApiError(String),

    #[error("时间解析错误: {0}")]
    ChronoError(#[from] chrono::ParseError),
}

fn parse_time_auto() -> Result<(), MyError> {
    let _dt = NaiveDateTime::parse_from_str("invalid", "%Y-%m-%d %H:%M:%S")?;
    Ok(())
}
    
```

## ✅ 总结

  写法                            是否支持 ?   说明
------------------------------- ------------ --------------------------------------
  没写到枚举里                    ❌           Rust 不知道怎么转成你的 MyError 类型
  手动 .map_err(\...)             ✅           自己控制怎么封装
  用 #\[from\] 实现自动转换支持   ✅           支持 ?，不写 .map_err 也能转