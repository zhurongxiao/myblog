---
layout: post
title: "Bypass Github to synchronize git"
date: 2025-08-28 06:44:00 +0800
categories: gather

---


### step 1

```
rsync -avz --delete --exclude='man' --exclude='info' .git/ mac:/Users/zhurongxiao/downloads/te/test-project/.git/
```

### step 2

```
git reset --hard main
```

