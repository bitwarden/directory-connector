#!/bin/bash
set -e

BWDC_PROFILES_DIR=${BWDC_PROFILES_DIR:-"${BITWARDENCLI_CONNECTOR_APPDATA_DIR}/../"}
BWDC_SYNC_PARALLEL_MAX=${BWDC_SYNC_PARALLEL_MAX:-1}
BWDC_SYNC_INTERVAL_MIN=${BWDC_SYNC_INTERVAL_MIN:-'90s'}
BWDC_SCAN_SLEEP_DUR=${BWDC_SCAN_SLEEP_DUR:-'90s'}

while true
do
  cd $BWDC_PROFILES_DIR
  
  echo "Scan the profiles directory and send it off for sync. % below is the $BITWARDENCLI_CONNECTOR_APPDATA_DIR
   for each profile."
  find $BWDC_PROFILES_DIR -mindepth 1 -maxdepth 1 -type d -not -iname '.*' -print0 | xargs -0 -I % -n 1 -P $BWDC_SYNC_PARALLEL_MAX -r ./sync-profile.sh %

  
  [ "$1" != "loop" ] && break
  
  echo "Wait ${BWDC_SCAN_SLEEP_DUR} before scanning to sync again."
  sleep ${BWDC_SCAN_SLEEP_DUR}

done