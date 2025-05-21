---
layout: post
title: "Rust Place_order" 
date: 2025-05-09 14:58:00 +0800
categories: rust 

---

```rust
use crate::modules::client::CLIENT;
use crate::utils::redis::RedisUtil;
use crate::{error::BinanceError, utils::time::now_timestamp_millis};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;
const DEFAULT_QUANTITY: f64 = 0.002;
const STABLE_THRESHOLD: f64 = 0.1; // 市场稳定容差
const SLEEP_MS: u64 = 500;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderResponse {
    pub order_id: i64,
    pub symbol: String,
    pub status: String,
    pub client_order_id: String,
    pub price: String,
    pub orig_qty: String,
    pub executed_qty: String,
    pub cum_qty: String,
    pub cum_quote: String,
    pub time_in_force: String,
    #[serde(rename = "type")]
    pub order_type: String,
    pub side: String,
    pub position_side: String,
    pub stop_price: String,
    pub update_time: i64,
    pub working_type: String,
    pub price_protect: bool,
    pub orig_type: String,
    #[serde(default)]
    pub success: Option<bool>,
    #[serde(default)]
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct MarketData {
    #[serde(rename = "bidPrice")]
    bid_price: String,
    #[serde(rename = "askPrice")]
    ask_price: String,
}

fn generate_signature(query: &str, secret_key: &str) -> Result<String, BinanceError> {
    let mut mac = HmacSha256::new_from_slice(secret_key.as_bytes())
        .map_err(|_| BinanceError::SigningError)?;
    mac.update(query.as_bytes());
    Ok(hex::encode(mac.finalize().into_bytes()))
}

fn get_market_data() -> Result<(f64, f64), BinanceError> {
    let url = "https://fapi.binance.com/fapi/v1/ticker/bookTicker?symbol=BTCUSDT";
    let response = CLIENT.get(url).send().map_err(BinanceError::ReqwestError)?;
    let data: MarketData = response.json().map_err(BinanceError::ReqwestError)?;
    let bid = data
        .bid_price
        .parse::<f64>()
        .map_err(|_| BinanceError::ApiError("Invalid bid price".to_string()))?;
    let ask = data
        .ask_price
        .parse::<f64>()
        .map_err(|_| BinanceError::ApiError("Invalid ask price".to_string()))?;
    Ok((bid, ask))
}

fn truncate_f64(value: f64, precision: usize) -> f64 {
    let factor = 10f64.powi(precision as i32);
    (value * factor).floor() / factor
}

/// 新的稳定判断逻辑 + 激进挂单价
pub fn place_order(
    api_key: &str,
    secret_key: &str,
    direction: &str,
    quantity: Option<f64>,
    key_group: Option<usize>,
) -> Result<OrderResponse, BinanceError> {
    let quantity = quantity.unwrap_or(DEFAULT_QUANTITY);
    let side = match direction.to_uppercase().as_str() {
        "B" | "BUY" => "BUY",
        "S" | "SELL" => "SELL",
        _ => return Err(BinanceError::ClapError("无效的交易方向".to_string())),
    };

    // 死循环等待市场价格稳定
    let (final_price, _bid, _ask) = loop {
        let (bid1, ask1) = get_market_data()?;
        std::thread::sleep(std::time::Duration::from_secs(1));
        let (bid2, ask2) = get_market_data()?;

        let stable = match side {
            "BUY" => (ask2 - ask1).abs() < STABLE_THRESHOLD,
            "SELL" => (bid2 - bid1).abs() < STABLE_THRESHOLD,
            _ => false,
        };

        if stable {
            let price = match side {
                "BUY" => truncate_f64(bid2, 1),  // 激进挂 bid
                "SELL" => truncate_f64(ask2, 1), // 激进挂 ask
                _ => unreachable!(),
            };
            break (price, bid2, ask2);
        }

        std::thread::sleep(std::time::Duration::from_millis(SLEEP_MS));
    };

    let query = format!(
        "symbol=BTCUSDT&side={}&type=LIMIT&timeInForce=GTC&quantity={}&price={}&timestamp={}",
        side,
        quantity,
        final_price,
        now_timestamp_millis()
    );

    let signature = generate_signature(&query, secret_key)?;
    let url = format!(
        "https://fapi.binance.com/fapi/v1/order?{}&signature={}",
        query, signature
    );

    let response = CLIENT
        .post(&url)
        .header("X-MBX-APIKEY", api_key)
        .send()
        .map_err(BinanceError::ReqwestError)?;

    let raw_response = response.text().map_err(BinanceError::ReqwestError)?;

    match serde_json::from_str::<OrderResponse>(&raw_response) {
        Ok(order) => {
            if let Some(err_msg) = order.error {
                return Err(BinanceError::ApiError(err_msg));
            }

            if let Some(group) = key_group {
                let field = format!("place_orderId{}", group);
                let _ = RedisUtil::set_hash_string("trade", &field, &order.order_id.to_string());
            }

            Ok(order)
        }
        Err(e) => Err(BinanceError::ApiError(format!("无效的订单响应格式: {}", e))),
    }
}

```

# 解读 Rust 实现的稳定市场挂单逻辑（place\_order.rs）

本模块实现了一个智能下单逻辑：当市场价格在短时间内保持稳定时，采用激进挂单价格（买单挂 bid、卖单挂 ask）进行限价下单。

## 模块结构概览

```rust
use crate::modules::client::CLIENT;
use crate::utils::redis::RedisUtil;
use crate::{error::BinanceError, utils::time::now_timestamp_millis};
```

引入了 HTTP 客户端、Redis 工具、错误定义和时间戳工具。

## 核心常量和类型

```rust
const DEFAULT_QUANTITY: f64 = 0.002;
const STABLE_THRESHOLD: f64 = 0.1;
const SLEEP_MS: u64 = 500;
```

* `DEFAULT_QUANTITY`: 默认下单数量。
* `STABLE_THRESHOLD`: 市场价格变化小于此阈值则视为“稳定”。
* `SLEEP_MS`: 每轮稳定性判断后的等待时间（ms）。

### 响应结构体 `OrderResponse`

解析 Binance 的下单响应。

### 市场数据结构 `MarketData`

解析 Binance 最新的挂单价格（bid/ask）。

## 核心函数说明

### `get_market_data`

```rust
fn get_market_data() -> Result<(f64, f64), BinanceError>
```

从 Binance 获取当前 `BTCUSDT` 的 bid 和 ask 价格。

### `generate_signature`

```rust
fn generate_signature(query: &str, secret_key: &str) -> Result<String, BinanceError>
```

根据 Binance API 签名要求，使用 HMAC-SHA256 对 query 字符串进行签名。

### `truncate_f64`

```rust
fn truncate_f64(value: f64, precision: usize) -> f64
```

将浮点数截断到指定精度，用于挂单价格精度控制。

## 核心逻辑：`place_order`

```rust
pub fn place_order(...)
```

### 步骤详解：

1. **方向判断**：根据用户输入的 `direction` 参数判断买/卖方向。

2. **市场价格稳定性判断（死循环）**：

   * 连续两次间隔 1 秒获取 market data（bid/ask）。
   * 如果买单：检查 `ask` 是否稳定；卖单：检查 `bid` 是否稳定。
   * 如果稳定（差值 < `STABLE_THRESHOLD`），使用**激进挂单价**：

     * 买单：挂 `bid` 价
     * 卖单：挂 `ask` 价
   * 否则继续 sleep 然后重试。

3. **构造限价订单参数**：包括 symbol、方向、数量、挂单价、时间戳等。

4. **生成签名并发送下单请求**。

5. **解析响应**：

   * 如果响应包含 `error` 字段，则返回 API 错误。
   * 否则，如果指定了 `key_group`，将订单号写入 Redis。

6. **返回下单结果。**

## 特点总结

* **避免滑点判断误判**：不再判断成交价格 vs 市价差，而是判断市场是否动荡。
* **自动等待市场稳定**：确保下单更有把握成交。
* **激进挂单逻辑**：挂单价直接选择 bid/ask，增加成交概率。

## 可改进点

* 增加日志输出方便调试。
* 添加超时机制，避免陷入死循环。
* 支持更多交易对和参数灵活性配置。
