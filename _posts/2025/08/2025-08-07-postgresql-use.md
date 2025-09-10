---
layout: post
title: "PostgerSQL Operation Guide"
date: 2025-08-05 14:42:00 +0800
categories: gather
---

# PostgerSQL Operation Guide

**Copy the local table to the cloud server through the SSH tunnel and overwrite it**

```
pg_dump -h localhost -U postgres -d user_comments -t articles \
  --clean --no-owner --no-privileges | \
ssh ma "sudo -u postgres psql -d user_comments"
```

**delete database**

- Release all active connections to the database and drop the database:

```
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'video_txt'" -c "DROP DATABASE IF EXISTS video_txt;"
```



- Create database
```
  sudo -u postgres psql -c "CREATE DATABASE video_txt;"
```


### delete table
  
```
PGPASSWORD="zz" psql -h localhost -p 5433 -U train_btc_v2_user -d train_btc_v2_db -c "DROP TABLE IF EXISTS ml_predictions CASCADE;"
```


### new table
  
```
PGPASSWORD="zz" psql -h localhost -p 5433 -U train_btc_v2_user -d train_btc_v2_db -f /home/debian/web/train-btc-v2/predict/sql/create_predictions_table.sql
```

### export csv
  
```
PGPASSWORD="zz" psql -h localhost -p 5433 -U train_btc_v2_user -d train_btc_v2_db -c "\copy ml_predictions TO 'ml_predictions.csv' WITH CSV HEADER"
```
