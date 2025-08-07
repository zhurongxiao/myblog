---
layout: post
title: "PostgerSQL Periodic backup"
date: 2025-08-05 14:42:00 +0800
categories: gather
---


Alright — here’s the **improved hourly backup script** using `pg_dump -Fc` (custom format), storing as `.dump`, without extra gzip, plus logging restore instructions.

---

### `pg_backup_user_comments.sh`

```bash
#!/bin/bash

# ===== CONFIG =====
REMOTE_HOST="ma"                    # SSH host alias
REMOTE_DB_USER="postgres"           # PostgreSQL DB user
DB_NAME="user_comments"             # Database name
BACKUP_DIR="$HOME/pg_backups"        # Local backup directory
LOG_FILE="$HOME/pg_backups/backup.log"
MAX_BACKUPS=12                       # Keep last N backups
DATE_STR=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${DATE_STR}.dump"

# ===== PREPARE =====
mkdir -p "$BACKUP_DIR"
touch "$LOG_FILE"

echo "[$(date '+%F %T')] Starting backup..." >> "$LOG_FILE"

# ===== BACKUP =====
if ssh "$REMOTE_HOST" "sudo -u postgres pg_dump -Fc -d $DB_NAME" > "$BACKUP_FILE"; then
    echo "[$(date '+%F %T')] Backup successful: $BACKUP_FILE" >> "$LOG_FILE"
    echo "[$(date '+%F %T')] Restore example: pg_restore -d $DB_NAME $BACKUP_FILE" >> "$LOG_FILE"
else
    echo "[$(date '+%F %T')] ERROR: Backup failed" >> "$LOG_FILE"
    exit 1
fi

# ===== CLEANUP OLD BACKUPS =====
BACKUP_COUNT=$(ls -1t "$BACKUP_DIR"/*.dump 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    TO_DELETE=$((BACKUP_COUNT - MAX_BACKUPS))
    OLD_BACKUPS=$(ls -1t "$BACKUP_DIR"/*.dump | tail -n "$TO_DELETE")
    echo "[$(date '+%F %T')] Removing old backups:" >> "$LOG_FILE"
    echo "$OLD_BACKUPS" >> "$LOG_FILE"
    rm -f $OLD_BACKUPS
fi

echo "[$(date '+%F %T')] Backup process completed." >> "$LOG_FILE"
```

---

### **Restore Example**

From the log or manually:

```bash
pg_restore -d user_comments /path/to/user_comments_2025-08-07_14-00-00.dump
```

You can also restore to another DB:

```bash
createdb new_db
pg_restore -d new_db /path/to/backup.dump
```

Restore only one table:

```bash
pg_restore -d target_db -t articles /path/to/backup.dump
```

---

### **Setup Cron (hourly)**

```bash
crontab -e
```

Add:

```bash
0 * * * * /home/your_user/pg_backup_user_comments.sh
```

---

This keeps **last 12 hourly backups**, logs the restore command each time, and uses `pg_dump -Fc` so you get all the benefits of custom format.

---

If you want, I can also make this script **automatically restore to a test database once a day** so you know backups are valid. That’s something many production setups do for safety.
Do you want me to add that automatic restore verification?
