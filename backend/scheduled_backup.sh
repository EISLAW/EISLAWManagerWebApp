#!/bin/bash
# EISLAW Automated Backup Script
# Runs daily via cron to create database backup
#
# Cron entry: 0 3 * * * /home/azureuser/EISLAWManagerWebApp/backend/scheduled_backup.sh

LOG_DIR="/home/azureuser/EISLAWManagerWebApp/logs"
LOG_FILE="$LOG_DIR/backup.log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

echo "========================================" >> "$LOG_FILE"
echo "$(date '+%Y-%m-%d %H:%M:%S'): Starting scheduled backup" >> "$LOG_FILE"

# Run backup inside Docker container with auto-daily tag
RESULT=$(docker exec eislawmanagerwebapp-api-1 python3 /app/backend/backup.py create auto-daily 2>&1)
EXIT_CODE=$?

echo "$RESULT" >> "$LOG_FILE"

if [ $EXIT_CODE -eq 0 ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S'): Backup successful" >> "$LOG_FILE"
else
    echo "$(date '+%Y-%m-%d %H:%M:%S'): Backup FAILED (exit code: $EXIT_CODE)" >> "$LOG_FILE"
fi

# Clean up old auto-daily backups (keep last 7 days)
echo "$(date '+%Y-%m-%d %H:%M:%S'): Cleaning old backups..." >> "$LOG_FILE"
docker exec eislawmanagerwebapp-api-1 find /app/data/backups -name "*auto-daily*" -mtime +7 -delete 2>&1 >> "$LOG_FILE"

# Log current backup count
BACKUP_COUNT=$(docker exec eislawmanagerwebapp-api-1 ls -1 /app/data/backups/*.db 2>/dev/null | wc -l)
echo "$(date '+%Y-%m-%d %H:%M:%S'): Total backups: $BACKUP_COUNT" >> "$LOG_FILE"
echo "$(date '+%Y-%m-%d %H:%M:%S'): Scheduled backup complete" >> "$LOG_FILE"
