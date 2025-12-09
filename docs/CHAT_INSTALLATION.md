# Mattermost Chat System Installation Guide

**Date:** 2025-12-10
**Installer:** Jane (Junior DevOps)
**Task:** CHAT-002
**Platform:** Mattermost v10.11.5 (Enterprise Edition)
**Status:** ✅ DOCKER CONTAINERS RUNNING - CEO ACTION REQUIRED FOR INITIAL SETUP

---

## Table of Contents

1. [Installation Summary](#1-installation-summary)
2. [System Requirements](#2-system-requirements)
3. [Installation Steps Completed](#3-installation-steps-completed)
4. [CEO Action Required](#4-ceo-action-required)
5. [Webhook Configuration](#5-webhook-configuration)
6. [Backup & Restore Procedures](#6-backup--restore-procedures)
7. [Maintenance & Troubleshooting](#7-maintenance--troubleshooting)
8. [Container Management](#8-container-management)

---

## 1. Installation Summary

### Current Status

| Component | Status | Details |
|-----------|--------|---------|
| **Mattermost Container** | ✅ Running | Healthy, accessible at http://localhost:8065 |
| **PostgreSQL Container** | ✅ Running | Database initialized, internal port 5432 |
| **HTTP Endpoint** | ✅ Responding | HTTP 200 on localhost:8065 |
| **Initial Setup** | ⏳ **CEO ACTION REQUIRED** | Admin account needs creation via browser |

### Installation Details

- **Installation Path:** `C:\Coding Projects\mattermost-chat`
- **Docker Compose Files:** `docker-compose.yml` + `docker-compose.without-nginx.yml`
- **Environment File:** `.env` (configured for local development)
- **Database Password:** `eislaw_mattermost_2025_secure!` (stored in `.env`)
- **Timezone:** Asia/Jerusalem
- **Port:** 8065 (mapped to host)

---

## 2. System Requirements

### Prerequisites Met

- ✅ Docker Desktop for Windows (installed)
- ✅ Docker Compose v2 (included with Docker Desktop)
- ✅ 4GB RAM available (Mattermost + PostgreSQL ~1-2GB)
- ✅ 10GB disk space (container images + database)
- ✅ Port 8065 available (verified)

### Resource Usage

| Resource | Allocated | Actual Usage (Estimated) |
|----------|-----------|--------------------------|
| CPU | 1 core | 0.5 cores (idle) |
| RAM | 1GB | ~512MB (Mattermost) + ~512MB (PostgreSQL) |
| Disk | 2.5GB | Container images + database |
| Network | localhost:8065 | No external exposure |

---

## 3. Installation Steps Completed

### Step 1: Repository Clone ✅
```bash
cd "C:\Coding Projects"
git clone https://github.com/mattermost/docker mattermost-chat
cd mattermost-chat
```

**Result:** Repository cloned successfully

### Step 2: Environment Configuration ✅
Created `.env` file with:
- `DOMAIN=localhost`
- `TZ=Asia/Jerusalem`
- `POSTGRES_PASSWORD=eislaw_mattermost_2025_secure!`
- `APP_PORT=8065`
- `MM_SERVICESETTINGS_SITEURL=http://localhost:8065`

**Result:** Environment configured for local development

### Step 3: Container Launch ✅
```bash
docker compose -f docker-compose.yml -f docker-compose.without-nginx.yml up -d
```

**Result:** Both containers running and healthy

### Step 4: Health Verification ✅
- Container status: `healthy`
- HTTP response: `200 OK`
- Ports mapped: `8065:8065` (HTTP), `8443:8443` (UDP/TCP for calls)

**Result:** Mattermost web UI accessible at http://localhost:8065

---

## 4. CEO Action Required

### Initial Setup Wizard

**URL:** http://localhost:8065

**Steps to Complete:**

#### 4.1 Create Admin Account

1. Open browser: http://localhost:8065
2. You'll see "Create your first team" screen
3. Click "Create a team"
4. Enter admin account details:
   - **Email:** `admin@eislaw.local`
   - **Username:** `eislaw-admin`
   - **Password:** (choose secure password - save to `secrets.json`)
5. Click "Create Account"

#### 4.2 Create Team

1. Team name: **EISLAW Agent Operations**
2. Team URL: `eislaw-agent-ops` (or leave default)
3. Click "Finish"

#### 4.3 Create Channels

Create 4 public channels:

| Channel Name | Purpose | Type |
|--------------|---------|------|
| `agent-tasks` | Agent start + progress updates | Public |
| `completions` | Completion announcements | Public |
| `reviews` | Jacob's review verdicts | Public |
| `ceo-updates` | High-priority CEO alerts | Public |

**Steps:**
1. Click "+" next to "Public Channels"
2. Name: `agent-tasks`
3. Purpose: "Agent task start and progress updates"
4. Click "Create Channel"
5. Repeat for `completions`, `reviews`, `ceo-updates`

---

## 5. Webhook Configuration

**IMPORTANT:** Webhooks can only be configured AFTER initial setup is complete.

### Steps to Configure Webhooks (CEO)

For each channel (`agent-tasks`, `completions`, `reviews`, `ceo-updates`):

1. Open the channel
2. Click channel name → **Integrations** → **Incoming Webhooks**
3. Click "Add Incoming Webhook"
4. Fill in details:
   - **Title:** `{channel_name} Agent Bot` (e.g., "agent-tasks Agent Bot")
   - **Description:** "Automated agent updates"
   - **Channel:** (should pre-fill with current channel)
   - **Icon:** (optional - upload EISLAW logo or use emoji)
5. Click "Save"
6. **Copy the webhook URL** (format: `http://localhost:8065/hooks/xxxxx...`)
7. Repeat for all 4 channels

### Expected Webhook URLs

You should have 4 webhook URLs like:
```
http://localhost:8065/hooks/abc123def456-agent-tasks
http://localhost:8065/hooks/ghi789jkl012-completions
http://localhost:8065/hooks/mno345pqr678-reviews
http://localhost:8065/hooks/stu901vwx234-ceo-updates
```

### Save to secrets.json

Once you have all 4 webhook URLs, add this section to `C:\Coding Projects\EISLAW System\secrets.local.json`:

```json
{
  "mattermost": {
    "base_url": "http://localhost:8065",
    "admin_username": "eislaw-admin",
    "admin_password": "YOUR_CHOSEN_PASSWORD_HERE",
    "webhooks": {
      "agent_tasks": "http://localhost:8065/hooks/YOUR_AGENT_TASKS_WEBHOOK",
      "completions": "http://localhost:8065/hooks/YOUR_COMPLETIONS_WEBHOOK",
      "reviews": "http://localhost:8065/hooks/YOUR_REVIEWS_WEBHOOK",
      "ceo_updates": "http://localhost:8065/hooks/YOUR_CEO_UPDATES_WEBHOOK"
    }
  }
}
```

**SECURITY NOTE:** `secrets.local.json` is git-ignored. Never commit webhook URLs to git.

---

## 6. Backup & Restore Procedures

### 6.1 Backup Script

**File:** `C:\Coding Projects\EISLAW System Clean\tools\backup_mattermost.sh`

```bash
#!/bin/bash
# Backup Mattermost database and configuration

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="C:/Coding Projects/mattermost-backups"
MATTERMOST_DIR="C:/Coding Projects/mattermost-chat"

mkdir -p "$BACKUP_DIR"

echo "[BACKUP] Starting Mattermost backup at $DATE..."

# Stop containers gracefully
cd "$MATTERMOST_DIR"
echo "[BACKUP] Stopping containers..."
docker compose -f docker-compose.yml -f docker-compose.without-nginx.yml stop

# Backup PostgreSQL database
echo "[BACKUP] Backing up PostgreSQL database..."
docker compose -f docker-compose.yml -f docker-compose.without-nginx.yml run --rm postgres \
  pg_dump -U mmuser mattermost > "$BACKUP_DIR/mattermost_db_$DATE.sql"

# Backup volumes (config, data, logs)
echo "[BACKUP] Backing up volumes..."
tar -czf "$BACKUP_DIR/mattermost_volumes_$DATE.tar.gz" ./volumes/

# Backup .env file
cp .env "$BACKUP_DIR/mattermost_env_$DATE.env"

# Restart containers
echo "[BACKUP] Restarting containers..."
docker compose -f docker-compose.yml -f docker-compose.without-nginx.yml up -d

echo "[BACKUP] Backup completed!"
echo "  - Database: $BACKUP_DIR/mattermost_db_$DATE.sql"
echo "  - Volumes: $BACKUP_DIR/mattermost_volumes_$DATE.tar.gz"
echo "  - Environment: $BACKUP_DIR/mattermost_env_$DATE.env"
```

**Usage:**
```bash
cd "C:\Coding Projects\EISLAW System Clean"
bash tools/backup_mattermost.sh
```

### 6.2 Restore Procedure

**To restore from backup:**

1. **Stop containers:**
   ```bash
   cd "C:\Coding Projects\mattermost-chat"
   docker compose -f docker-compose.yml -f docker-compose.without-nginx.yml down
   ```

2. **Restore database:**
   ```bash
   # Start only PostgreSQL
   docker compose -f docker-compose.yml up -d postgres

   # Restore database dump
   docker compose -f docker-compose.yml -f docker-compose.without-nginx.yml run --rm postgres \
     psql -U mmuser mattermost < /path/to/backup/mattermost_db_YYYYMMDD_HHMMSS.sql
   ```

3. **Restore volumes:**
   ```bash
   # Extract volumes backup
   cd "C:\Coding Projects\mattermost-chat"
   tar -xzf /path/to/backup/mattermost_volumes_YYYYMMDD_HHMMSS.tar.gz
   ```

4. **Restore .env file:**
   ```bash
   cp /path/to/backup/mattermost_env_YYYYMMDD_HHMMSS.env .env
   ```

5. **Restart all containers:**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.without-nginx.yml up -d
   ```

### 6.3 Backup Schedule Recommendation

- **Frequency:** Daily (low data volume, minimal overhead)
- **Retention:** Keep last 7 days
- **Location:** `C:/Coding Projects/mattermost-backups`
- **Automation:** Add to Windows Task Scheduler (optional)

---

## 7. Maintenance & Troubleshooting

### 7.1 Common Issues

#### Issue: Container not starting
```bash
# Check logs
docker logs mattermost-chat-mattermost-1
docker logs mattermost-chat-postgres-1

# Common fix: Rebuild containers
cd "C:\Coding Projects\mattermost-chat"
docker compose -f docker-compose.yml -f docker-compose.without-nginx.yml down
docker compose -f docker-compose.yml -f docker-compose.without-nginx.yml up -d
```

#### Issue: Cannot access http://localhost:8065
```bash
# Check if containers are running
docker ps | findstr mattermost

# Check port binding
netstat -ano | findstr :8065

# Check container health
docker inspect mattermost-chat-mattermost-1 | findstr Health
```

#### Issue: Database connection errors
```bash
# Check PostgreSQL logs
docker logs mattermost-chat-postgres-1

# Verify database credentials in .env
cat .env | findstr POSTGRES
```

### 7.2 View Logs

```bash
# Mattermost application logs
docker logs -f mattermost-chat-mattermost-1

# PostgreSQL logs
docker logs -f mattermost-chat-postgres-1

# Last 100 lines
docker logs --tail=100 mattermost-chat-mattermost-1
```

### 7.3 Update Mattermost Version

1. **Backup first** (see §6.1)
2. Edit `.env` and change `MATTERMOST_IMAGE_TAG` to new version
3. Pull new image and restart:
   ```bash
   cd "C:\Coding Projects\mattermost-chat"
   docker compose -f docker-compose.yml -f docker-compose.without-nginx.yml pull
   docker compose -f docker-compose.yml -f docker-compose.without-nginx.yml up -d
   ```

---

## 8. Container Management

### Start Containers
```bash
cd "C:\Coding Projects\mattermost-chat"
docker compose -f docker-compose.yml -f docker-compose.without-nginx.yml up -d
```

### Stop Containers
```bash
cd "C:\Coding Projects\mattermost-chat"
docker compose -f docker-compose.yml -f docker-compose.without-nginx.yml stop
```

### Restart Containers
```bash
cd "C:\Coding Projects\mattermost-chat"
docker compose -f docker-compose.yml -f docker-compose.without-nginx.yml restart
```

### Remove Containers (DESTRUCTIVE)
```bash
# WARNING: This removes ALL data (database, uploads, logs)
cd "C:\Coding Projects\mattermost-chat"
docker compose -f docker-compose.yml -f docker-compose.without-nginx.yml down -v
```

### View Container Status
```bash
docker ps | findstr mattermost
docker compose -f docker-compose.yml -f docker-compose.without-nginx.yml ps
```

---

## Next Steps

1. ✅ Docker containers installed and running
2. ⏳ **CEO:** Complete initial setup wizard (§4)
3. ⏳ **CEO:** Configure webhooks (§5)
4. ⏳ **CEO:** Save webhook URLs to `secrets.json`
5. ⏳ **Alex:** Create Python/Bash agent helpers (CHAT-003)
6. ⏳ **Joe:** Update CLAUDE.md with chat integration (CHAT-004)
7. ⏳ **Eli:** Test integration with 5 scenarios (CHAT-005)
8. ⏳ **Jacob:** Final review (CHAT-006)

---

**Installation completed by:** Jane (Junior DevOps)
**Date:** 2025-12-10
**Container IDs:**
- Mattermost: `e3493d7f5d7b`
- PostgreSQL: `efff94d159a8`

**Access URL:** http://localhost:8065

---

*See PRD_CHAT_INTEGRATION.md for full architecture and integration details*
