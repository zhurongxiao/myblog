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
- first into console
  
```
  psql -U postgres -h localhost
```

- Ternubate all active connections to the database:

```
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'user_comments'
  AND pid <> pg_backend_pid();  -- Don't kill your own session
```

- Now drop the database

```
  DROP DATABASE IF EXISTS user_comments;
```


- Create database
```
  sudo -u postgres psql -c "CREATE DATABASE user_comments;"
```

