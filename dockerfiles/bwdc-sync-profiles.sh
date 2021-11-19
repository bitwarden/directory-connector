#!/bin/bash

BWDC_SYNC_PROFILES_DIR=${BWDC_SYNC_PROFILES_DIR:-"${BITWARDENCLI_CONNECTOR_APPDATA_DIR}/../"}
# BWDC_SYNC_MININTERVAL=${BWDC_SYNC_MININTERVAL:-'90s'}
# BACKUP_INTERVAL_FORMAT=${BACKUP_INTERVAL_FORMAT:-%Y-%m-%d 00:00:00}
# export BACKUP_DB_DIR=${BACKUP_DB_DIR:-'/etc/bitwarden/mssql/backups/'}
# BACKUP_DB_KEEP_MTIME=${BACKUP_DB_KEEP_MTIME:-'+32'}

while true
do
  
find $PWD -mindepth 1 -maxdepth 1 -type d -not -iname '.*' -print0 | xargs -0 -I '@' -n 1 -r bash -c '
    export BITWARDENCLI_CONNECTOR_APPDATA_DIR=@;
    sleep 1; 
    echo "Processing:" $BITWARDENCLI_CONNECTOR_APPDATA_DIR;'



  [ "$1" != "loop" ] && break

done