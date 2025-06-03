---
layout: post
title: "Rust BTC support/resistance levels Analysis"
date: 2025-06-03 15:24:00 +0800
categories: rust

---

```rust
use reqwest;
use serde::Deserialize;
use std::collections::HashMap;
use tokio;

#[derive(Debug, Clone)]
struct OHLCV {
    high: f64,
    low: f64,
    close: f64,
}

#[derive(Debug)]
struct SupportResistanceLevel {
    price: f64,
    strength: i32,
    level_type: String, // "support" or "resistance"
}

struct BinanceClient {
    client: reqwest::Client,
    base_url: String,
}

impl BinanceClient {
    fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
            base_url: "https://api.binance.com".to_string(),
        }
    }

    async fn get_klines(&self, symbol: &str, interval: &str, limit: u16) -> Result<Vec<OHLCV>, Box<dyn std::error::Error>> {
        let url = format!(
            "{}/api/v3/klines?symbol={}&interval={}&limit={}",
            self.base_url, symbol, interval, limit
        );

        let response = self.client.get(&url).send().await?;
        let klines: Vec<Vec<serde_json::Value>> = response.json().await?;

        let mut ohlcv_data = Vec::new();
        for kline in klines {
            let ohlcv = OHLCV {
                high: kline[2].as_str().unwrap().parse()?,
                low: kline[3].as_str().unwrap().parse()?,
                close: kline[4].as_str().unwrap().parse()?,
            };
            ohlcv_data.push(ohlcv);
        }

        Ok(ohlcv_data)
    }

    async fn get_current_price(&self, symbol: &str) -> Result<f64, Box<dyn std::error::Error>> {
        let url = format!("{}/api/v3/ticker/price?symbol={}", self.base_url, symbol);
        let response = self.client.get(&url).send().await?;
        
        #[derive(Deserialize)]
        struct PriceResponse {
            price: String,
        }
        
        let price_data: PriceResponse = response.json().await?;
        Ok(price_data.price.parse()?)
    }
}

struct TechnicalAnalyzer;

impl TechnicalAnalyzer {
    // Find pivot highs and lows
    fn find_pivots(data: &[OHLCV], window: usize) -> (Vec<(usize, f64)>, Vec<(usize, f64)>) {
        let mut pivot_highs = Vec::new();
        let mut pivot_lows = Vec::new();

        for i in window..data.len() - window {
            let current_high = data[i].high;
            let current_low = data[i].low;

            // Check if current high is higher than surrounding highs
            let is_pivot_high = (i - window..i)
                .chain(i + 1..=i + window)
                .all(|j| data[j].high < current_high);

            // Check if current low is lower than surrounding lows
            let is_pivot_low = (i - window..i)
                .chain(i + 1..=i + window)
                .all(|j| data[j].low > current_low);

            if is_pivot_high {
                pivot_highs.push((i, current_high));
            }
            if is_pivot_low {
                pivot_lows.push((i, current_low));
            }
        }

        (pivot_highs, pivot_lows)
    }

    // Calculate support and resistance levels
    fn calculate_support_resistance(
        _data: &[OHLCV],
        pivot_highs: &[(usize, f64)],
        pivot_lows: &[(usize, f64)],
        tolerance: f64,
    ) -> Vec<SupportResistanceLevel> {
        let mut levels = Vec::new();
        let mut price_clusters: HashMap<i32, Vec<(f64, String)>> = HashMap::new();

        // Group pivot highs into clusters (potential resistance)
        for &(_idx, price) in pivot_highs {
            let price_key = (price / tolerance) as i32;
            price_clusters
                .entry(price_key)
                .or_insert_with(Vec::new)
                .push((price, "resistance".to_string()));
        }

        // Group pivot lows into clusters (potential support)
        for &(_idx, price) in pivot_lows {
            let price_key = (price / tolerance) as i32;
            price_clusters
                .entry(price_key)
                .or_insert_with(Vec::new)
                .push((price, "support".to_string()));
        }

        // Convert clusters to support/resistance levels
        for (_, cluster) in price_clusters {
            if cluster.len() >= 2 {
                // Only consider levels with multiple touches
                let avg_price = cluster.iter().map(|(p, _)| p).sum::<f64>() / cluster.len() as f64;
                let level_type = cluster[0].1.clone();

                levels.push(SupportResistanceLevel {
                    price: avg_price,
                    strength: cluster.len() as i32,
                    level_type,
                });
            }
        }

        // Sort by strength (number of touches)
        levels.sort_by(|a, b| b.strength.cmp(&a.strength));
        levels
    }

    // Calculate RSI for additional confirmation
    fn calculate_rsi(data: &[OHLCV], period: usize) -> Vec<f64> {
        if data.len() < period + 1 {
            return Vec::new();
        }

        let mut gains = Vec::new();
        let mut losses = Vec::new();

        // Calculate price changes
        for i in 1..data.len() {
            let change = data[i].close - data[i - 1].close;
            if change > 0.0 {
                gains.push(change);
                losses.push(0.0);
            } else {
                gains.push(0.0);
                losses.push(-change);
            }
        }

        let mut rsi_values = Vec::new();
        
        // Calculate initial average gain and loss
        let mut avg_gain: f64 = gains[..period].iter().sum::<f64>() / period as f64;
        let mut avg_loss: f64 = losses[..period].iter().sum::<f64>() / period as f64;

        // Calculate RSI
        for i in period..gains.len() {
            if avg_loss == 0.0 {
                rsi_values.push(100.0);
            } else {
                let rs = avg_gain / avg_loss;
                let rsi = 100.0 - (100.0 / (1.0 + rs));
                rsi_values.push(rsi);
            }

            // Update averages using smoothing
            avg_gain = (avg_gain * (period - 1) as f64 + gains[i]) / period as f64;
            avg_loss = (avg_loss * (period - 1) as f64 + losses[i]) / period as f64;
        }

        rsi_values
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = BinanceClient::new();
    
    println!("🔍 Fetching BTCUSDT data from Binance...");
    
    // Get current price
    let current_price = client.get_current_price("BTCUSDT").await?;
    println!("📊 Current BTCUSDT Price: ${:.2}", current_price);

    // Get historical data (500 4-hour candles for better analysis)
    let klines = client.get_klines("BTCUSDT", "4h", 500).await?;
    println!("📈 Retrieved {} candles for analysis", klines.len());

    // Find pivot points
    let (pivot_highs, pivot_lows) = TechnicalAnalyzer::find_pivots(&klines, 5);
    println!("🔍 Found {} pivot highs and {} pivot lows", pivot_highs.len(), pivot_lows.len());

    // Calculate support and resistance levels
    let tolerance = current_price * 0.01; // 1% tolerance for clustering
    let levels = TechnicalAnalyzer::calculate_support_resistance(
        &klines,
        &pivot_highs,
        &pivot_lows,
        tolerance,
    );

    // Calculate RSI for current market condition
    let rsi_values = TechnicalAnalyzer::calculate_rsi(&klines, 14);
    let current_rsi = rsi_values.last().unwrap_or(&50.0);

    println!("\n📊 BTCUSDT Technical Analysis Report");
    println!("=====================================");
    println!("Current Price: ${:.2}", current_price);
    println!("Current RSI(14): {:.2}", current_rsi);
    
    // Market condition based on RSI
    let market_condition = match current_rsi {
        rsi if *rsi > 70.0 => "Overbought 🔴",
        rsi if *rsi < 30.0 => "Oversold 🟢",
        _ => "Neutral 🟡",
    };
    println!("Market Condition: {}", market_condition);

    println!("\n🎯 Key Support & Resistance Levels:");
    println!("===================================");

    // Separate and display support and resistance levels
    let mut support_levels: Vec<_> = levels.iter()
        .filter(|l| l.level_type == "support" && l.price < current_price)
        .collect();
    support_levels.sort_by(|a, b| b.price.partial_cmp(&a.price).unwrap());

    let mut resistance_levels: Vec<_> = levels.iter()
        .filter(|l| l.level_type == "resistance" && l.price > current_price)
        .collect();
    resistance_levels.sort_by(|a, b| a.price.partial_cmp(&b.price).unwrap());

    println!("\n🛡️  SUPPORT LEVELS (below current price):");
    for (i, level) in support_levels.iter().take(5).enumerate() {
        let distance = ((current_price - level.price) / current_price) * 100.0;
        println!("  {}. ${:.2} | Strength: {} touches | Distance: -{:.2}%", 
                 i + 1, level.price, level.strength, distance);
    }

    println!("\n🚫 RESISTANCE LEVELS (above current price):");
    for (i, level) in resistance_levels.iter().take(5).enumerate() {
        let distance = ((level.price - current_price) / current_price) * 100.0;
        println!("  {}. ${:.2} | Strength: {} touches | Distance: +{:.2}%", 
                 i + 1, level.price, level.strength, distance);
    }

    // Trading recommendations
    println!("\n💡 Trading Insights:");
    println!("===================");
    
    if let Some(nearest_support) = support_levels.first() {
        let support_distance = ((current_price - nearest_support.price) / current_price) * 100.0;
        println!("• Nearest Support: ${:.2} ({:.2}% below)", nearest_support.price, support_distance);
        
        if support_distance < 2.0 {
            println!("  ⚠️  Price is very close to support - watch for bounce or breakdown");
        }
    }

    if let Some(nearest_resistance) = resistance_levels.first() {
        let resistance_distance = ((nearest_resistance.price - current_price) / current_price) * 100.0;
        println!("• Nearest Resistance: ${:.2} ({:.2}% above)", nearest_resistance.price, resistance_distance);
        
        if resistance_distance < 2.0 {
            println!("  ⚠️  Price is very close to resistance - watch for rejection or breakout");
        }
    }

    // Volume analysis suggestion
    println!("\n📊 Next Steps for Enhanced Analysis:");
    println!("• Monitor volume at key levels for confirmation");
    println!("• Watch for price action patterns near support/resistance");
    println!("• Consider multiple timeframes for confluence");
    
    Ok(())
}

// Add to Cargo.toml:
/*
[dependencies]
reqwest = { version = "0.11", features = ["json"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.0", features = ["full"] }
*/
```

This Rust code is a comprehensive technical analysis tool for cryptocurrency trading, specifically designed to analyze BTC/USDT (Bitcoin/Tether) price data from the Binance exchange. Let me break down its components and functionality:

### Key Components:

1. **BinanceClient**:
   - Handles API communication with Binance
   - Methods to fetch:
     - K-line/candlestick data (`get_klines`)
     - Current price (`get_current_price`)

2. **OHLCV Struct**:
   - Stores price data (High, Low, Close - Open and Volume are not used in this implementation)

3. **TechnicalAnalyzer**:
   - Core analysis functionality:
     - Finds pivot highs/lows (`find_pivots`)
     - Calculates support/resistance levels (`calculate_support_resistance`)
     - Computes RSI (Relative Strength Index) (`calculate_rsi`)

4. **SupportResistanceLevel**:
   - Stores identified levels with:
     - Price value
     - Strength (number of touches)
     - Type (support/resistance)

### Workflow:

1. **Data Fetching**:
   - Gets 500 candles of 4-hour BTC/USDT data
   - Retrieves current price

2. **Technical Analysis**:
   - Identifies pivot points (local highs/lows)
   - Clusters similar price levels to find support/resistance
   - Calculates RSI for overbought/oversold conditions

3. **Reporting**:
   - Displays current price and RSI
   - Lists key support/resistance levels with:
     - Distance from current price
     - Strength (number of touches)
   - Provides trading insights based on proximity to levels

### Key Technical Indicators:

1. **Pivot Points**:
   - Identifies significant highs/lows within a window (5 periods)
   - Used as basis for support/resistance levels

2. **Support/Resistance**:
   - Levels are clustered with 1% tolerance
   - Only levels with ≥ 2 touches are considered
   - Sorted by strength (more touches = stronger level)

3. **RSI (14-period)**:
   - Standard momentum oscillator
   - Used to identify overbought (>70) and oversold (<30) conditions

### Trading Insights:

The analysis provides:
- Visual distance to nearest support/resistance
- Warnings when price approaches key levels (<2% away)
- Market condition based on RSI
- Suggested next steps for deeper analysis

### Strengths:
- Uses multiple confirmation methods (price levels + RSI)
- Provides quantitative strength metrics for levels
- Clear visualization of distance to key levels
- Practical trading suggestions

### Potential Enhancements:
- Add volume analysis
- Incorporate more timeframes
- Add additional indicators (MACD, moving averages)
- Implement breakout detection
- Add backtesting capability

This is a solid foundation for a technical analysis tool that could be extended with more features for comprehensive trading analysis. The code is well-structured and follows Rust best practices with proper error handling and async/await patterns.

