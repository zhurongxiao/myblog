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

