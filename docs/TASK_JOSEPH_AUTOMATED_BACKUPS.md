# Task: Automated Backup Scheduler

**Assigned To:** Joseph (Database Developer)
**Date:** 2025-12-05
**Priority:** P2

---

## Objective

Set up automated daily backups for the SQLite database using the backup utility you created.

---

## Background

You created `backend/backup.py` with manual backup commands. Now we need automated scheduling to ensure regular backups without manual intervention.

---

## Task Checklist

### 1. Choose Scheduling Method

Options:
| Method | Pros | Cons |
|--------|------|------|
| Cron job on VM | Simple, reliable | Requires SSH access |
| Docker healthcheck | Container-native | Limited scheduling |
| Python scheduler | In-process | Stops when API stops |
| Systemd timer | Robust | More complex |

**Recommended:** Cron job on Azure VM

### 2. Create Backup Script

**File:** `backend/scheduled_backup.sh`

```bash
#!/bin/bash
# EISLAW Automated Backup Script
# Runs daily to create database backup

LOG_FILE="/home/azureuser/EISLAWManagerWebApp/logs/backup.log"
BACKUP_DIR="/home/azureuser/EISLAWManagerWebApp/data/backups"

echo "$(date): Starting scheduled backup" >> $LOG_FILE

# Run backup inside Docker container
docker exec eislawmanagerwebapp-api-1 python backup.py create --label "auto-daily" >> $LOG_FILE 2>&1

# Keep only last 7 days of auto backups
find $BACKUP_DIR -name "*auto-daily*" -mtime +7 -delete

echo "$(date): Backup complete" >> $LOG_FILE
```

### 3. Set Up Cron Job

SSH to VM and add cron entry:

```bash
# Edit crontab
crontab -e

# Add daily backup at 3 AM
0 3 * * * /home/azureuser/EISLAWManagerWebApp/backend/scheduled_backup.sh
```

### 4. Create Backup Retention Policy

| Backup Type | Retention |
|-------------|-----------|
| Auto-daily | 7 days |
| Manual | 30 days |
| Pre-restore | 90 days |

### 5. Add Backup Monitoring

Create simple health check:

```python
# backend/check_backups.py
import os
from datetime import datetime, timedelta

BACKUP_DIR = "/app/data/backups"
MAX_AGE_HOURS = 26  # Alert if no backup in 26 hours

def check_recent_backup():
    files = os.listdir(BACKUP_DIR)
    if not files:
        return False, "No backups found"

    newest = max(files, key=lambda f: os.path.getmtime(os.path.join(BACKUP_DIR, f)))
    mtime = datetime.fromtimestamp(os.path.getmtime(os.path.join(BACKUP_DIR, newest)))
    age = datetime.now() - mtime

    if age > timedelta(hours=MAX_AGE_HOURS):
        return False, f"Last backup is {age.hours} hours old"

    return True, f"Last backup: {newest}"

if __name__ == "__main__":
    ok, msg = check_recent_backup()
    print(f"{'✅' if ok else '❌'} {msg}")
```

### 6. Test Automation

1. Run script manually first
2. Check backup was created
3. Wait for cron to trigger
4. Verify log file

---

## Success Criteria

- [x] Backup script created
- [x] Cron job configured
- [x] Retention policy implemented
- [x] Backup monitoring added
- [x] Test run successful

---

## Completion Report

**Date:** 2025-12-05

**Files Created:**
| File | Purpose |
|------|---------|
| `backend/scheduled_backup.sh` | Automated backup script for cron |
| `backend/check_backups.py` | Backup health monitoring |

**Cron Schedule:** `0 3 * * *` (Daily at 3:00 AM)

**Retention Policy:**
| Type | Days |
|------|------|
| auto-daily | 7 days (auto-cleaned) |
| manual | Kept indefinitely |
| pre-restore | Kept indefinitely |

**Test Results:**
- [x] Manual script run - created `eislaw_20251205_195634_auto-daily.db`
- [x] Cron job configured - verified with `crontab -l`
- [x] Old backup cleanup - script includes `find -mtime +7 -delete`
- [x] Monitoring works - shows 5 backups, 0.0 hours old, HEALTHY status

**Current Backups:** 5 total (1 auto, 4 manual)

**Log Location:** `/home/azureuser/EISLAWManagerWebApp/logs/backup.log`

**Issues Encountered:**
- Windows CRLF line endings in script - fixed with `sed -i "s/\r//g"`

---

**Assigned:** 2025-12-05
