---
layout: post
title: "Rust Redis r2d2 配置两种方式对比文档" 
date: 2025-05-09 09:05:00 +0800
categories: rust 

---



# Redis r2d2 配置两种方式对比文档

## 基础依赖

```toml
# 新版本配置 (redis 0.30+ 已内置 r2d2)
r2d2 = "0.8.1"
redis = { version = "0.30", features = ["r2d2"] }
```

## 方式1: 直接使用 redis::Client + r2d2

```rust
use redis::Commands;

fn main() {
    let client = redis::Client::open("redis://127.0.0.1/").unwrap();
    let pool = r2d2::Pool::builder().build(client).unwrap();
    let mut conn = pool.get().unwrap();

    let _: () = conn.set("KEY", "VALUE").unwrap();
    let val: String = conn.get("KEY").unwrap();
    println!("{}", val);
}
```

### 优点

* 简洁明了，适合小项目/测试性工程
* 无需依赖 `r2d2_redis`
* redis 0.30+ 已支持 r2d2 trait

### 缺点

* 未封装，不易维护和扩展
* 没有处理异常管理、时间戳、数据类型转换，需要手动处理

---

## 方式2: 封装 RedisUtil 工具类 + 全局连接池

### 根本文件

```rust
static REDIS_POOL: Lazy<RedisPool> = Lazy::new(|| {
    let client = redis::Client::open("redis://127.0.0.1/").unwrap();
    Pool::builder().max_size(10).build(client).unwrap()
});
```

### RedisUtil 方法分类:

* get/set\_string, get/set\_f64, get/set\_hash\_\*
* delete\_key, del\_hash\_field
* set\_mixed\_data/get\_mixed\_data
* can\_execute: 用于减少重复执行
* 造成 BinanceError 统一异常处理
* pool\_status(): 获取连接池运行情况

### 优点

* 构建形如 SDK 的事务和功能层，重用性强
* 无需在于综合项目中反复写代码
* 利于维护、性能监控、缓存处理

### 缺点

* 代码重，比较合适于个人工具库或企业级项目
* 初期上手或组织不合理则维护成本上升

---

## 总结建议

| 场景              | 选择方案 |
| --------------- | ---- |
| 单文件小工具 / CLI 脚本 | 方式1  |
| 多模块项目 / 需维护、扩展  | 方式2  |

---

## 配套链接

* redis-rs r2d2 内置支持: [https://github.com/redis-rs/redis-rs/pull/384](https://github.com/redis-rs/redis-rs/pull/384)
* 资料指南: [https://docs.rs/redis/latest/redis/](https://docs.rs/redis/latest/redis/)
* 引用评论: [https://github.com/redis-rs/redis-rs/issues/385#issuecomment-702225057](https://github.com/redis-rs/redis-rs/issues/385#issuecomment-702225057)


## 手动封装版

```rust
use crate::error::BinanceError;
use once_cell::sync::Lazy;
use r2d2::{ManageConnection, Pool, PooledConnection};
use redis::{Client, Commands, Connection, RedisError};

// 自定义 Redis 连接池管理器
pub struct RedisConnectionManager {
    client: Client,
}

impl RedisConnectionManager {
    pub fn new(redis_url: &str) -> Result<Self, RedisError> {
        let client = Client::open(redis_url)?;
        Ok(Self { client })
    }
}

impl ManageConnection for RedisConnectionManager {
    type Connection = Connection;
    type Error = RedisError;

    fn connect(&self) -> Result<Self::Connection, Self::Error> {
        self.client.get_connection()
    }

    fn is_valid(&self, conn: &mut Self::Connection) -> Result<(), Self::Error> {
        redis::cmd("PING").query(conn).map(|_: String| ())
    }

    fn has_broken(&self, _: &mut Self::Connection) -> bool {
        false
    }
}

// 类型别名
type RedisPool = Pool<RedisConnectionManager>;
type RedisConn = PooledConnection<RedisConnectionManager>;

// 全局 Redis 连接池（最大20连接）
static REDIS_POOL: Lazy<RedisPool> = Lazy::new(|| {
    let manager =
        RedisConnectionManager::new("redis://127.0.0.1/").expect("Failed to create Redis manager");
    Pool::builder()
        .max_size(10)
        .build(manager)
        .expect("Failed to build Redis connection pool")
});

// 连接池状态结构体 测试用
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct PoolStatus {
    pub connections: u32,
    pub idle_connections: u32,
    pub max_size: u32,
}

pub struct RedisUtil;

impl RedisUtil {
    fn get_conn() -> Result<RedisConn, BinanceError> {
        REDIS_POOL
            .get()
            .map_err(|e| BinanceError::ApiError(format!("Get redis conn failed: {}", e)))
    }

    pub fn execute<F, T>(func: F) -> Result<T, BinanceError>
    where
        F: FnOnce(&mut RedisConn) -> Result<T, RedisError>,
    {
        let mut conn = Self::get_conn()?;
        func(&mut conn).map_err(BinanceError::RedisError)
    }

    pub fn set_string(key: &str, value: &str) -> Result<(), BinanceError> {
        Self::execute(|conn| conn.set(key, value))
    }

    pub fn get_string(key: &str) -> Option<String> {
        Self::execute(|conn| conn.get::<_, String>(key)).ok()
    }
}
```

# Redis 连接池工具类解读

该 Rust 代码文件实现了一个基于 `r2d2` 和 `redis` 的自定义 Redis 连接池管理器和全局连接池，并通过工具类 `RedisUtil` 实现常规 Redis 操作。

---

## 一、RedisConnectionManager 连接管理器

```rust
pub struct RedisConnectionManager {
    client: Client,
}
```

通过 `Client::open` 创建 Redis client，并实现 `ManageConnection` trait 用于支持 `r2d2::Pool` 管理连接：

* `connect` 用于创建连接
* `is_valid` 用 `PING` 命令检测连接是否有效
* `has_broken` 回复 false，表示不检测破损连接

---

## 二、全局 Redis 连接池

使用 `once_cell::sync::Lazy` 实现全局单例 Redis 连接池：

```rust
static REDIS_POOL: Lazy<RedisPool> = Lazy::new(|| {
    let manager = RedisConnectionManager::new("redis://127.0.0.1/")
        .expect("Failed to create Redis manager");
    Pool::builder()
        .max_size(10)
        .build(manager)
        .expect("Failed to build Redis connection pool")
});
```

使用的最大连接数为 10。

---

## 三、RedisUtil 工具类

### 连接获取

```rust
fn get_conn() -> Result<RedisConn, BinanceError>
```

从连接池获取一个连接，如果失败则转换为 `BinanceError::ApiError`。

### 通用操作 execute

```rust
pub fn execute<F, T>(func: F) -> Result<T, BinanceError>
where
    F: FnOnce(&mut RedisConn) -> Result<T, RedisError>
```

提供通用 Redis 操作方法，将用户的操作写在 closure 中，并自动处理 RedisError 和 BinanceError 的转换。

### 常用方法

```rust
pub fn set_string(key: &str, value: &str) -> Result<(), BinanceError>
```

设置指定键值

```rust
pub fn get_string(key: &str) -> Option<String>
```

获取键对应值，失败则返回 None

---

## 四、PoolStatus 结构体

```rust
#[derive(Debug, Clone)]
pub struct PoolStatus {
    pub connections: u32,
    pub idle_connections: u32,
    pub max_size: u32,
}
```

为清查或测试目的提供的连接池状态数据结构（未实际使用）。

---

## 总结

该代码结构清晰，通过 r2d2 和 once\_cell 实现绿色可重用的 Redis 连接池，实现常规操作抽象到工具类，简化了应用开发中和 Redis 交互的逻辑。
