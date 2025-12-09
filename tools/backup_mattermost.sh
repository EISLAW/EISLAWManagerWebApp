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
