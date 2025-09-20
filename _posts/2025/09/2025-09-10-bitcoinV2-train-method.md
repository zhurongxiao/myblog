---
layout: post
title: "bitcoinV2 train method"
date: 2025-09-10 16:35:00 +0800
categories: gather

---

### export origin table
- bitcoin-ml-training  
```
./scripts/export_training_data.sh
```

### copy  -> rclone r2:/test


### local obtain   -> /data

### process data
  

```
./scripts/process_training_data.sh /data/bitcoin_training_data_binary.csv
```
  
### train  
  
```
./scripts/train.sh
```

### return
  
```
rclone sync "r2:test/models" "/home/ecs-user/web/train-btc-v2/predict/models"  \
        --create-empty-src-dirs \
        --progress \
        --stats=5s \
        --timeout=30s \
        --retries=3 \
        --verbose
```

