#!/bin/bash
#read pipedin

# Do not exit on error on a single profile
set +e

# Synopsis: Wrapper for Bitwarden Directory Connector to facilitate multiple sync profiles.

# Passed parameter overrides the sys-wide definition.
[ -n "$1" ] && export BITWARDENCLI_CONNECTOR_APPDATA_DIR="$1"

echo "Processing profile in: ${BITWARDENCLI_CONNECTOR_APPDATA_DIR}"
cd $BITWARDENCLI_CONNECTOR_APPDATA_DIR

# Profile Name = Name of Current Directory
BWDC_PROFILENAME=${PWD##*/}

# Allow users to specify conf per profile with Variables
# Syntax: BWDC_CONF__<PROFILENAME>__<VARNAME>=<VALUE>
# Example: BWDC_CONF__syncprofile_1__BW_CLIENTID=VALUE
ProfileConfPrefix=${ProfileConfPrefix:-"BWDC_CONF__${BWDC_PROFILENAME}__"}
eval 'vars=(${!'"$ProfileConfPrefix"'@})'
echo "Found ${#vars[@]} environment variables to declare in this profile. Export below:"
for i in "${vars[@]}"; do
    ActualVarName=${i/"$ProfileConfPrefix"/}
    # echo "$i corresponds to $ActualVarName"
    echo "$ActualVarName=${!i}"
    export $ActualVarName=${!i}
done
echo "Debug: All BW Variables in this session: ${!BW*}"

# Print relevant info
echo "bwdc config-file: $(bwdc data-file)"
echo "bwdc last-sync users: $(bwdc last-sync users)"
echo "bwdc last-sync groups: $(bwdc last-sync groups)"

# Note:
# if (timeNow-lastSync)>interval: bwdc sync
## Needs to be done. Preferably within the nodejs app as opposed to the wrappper.
## Ideally with a BWDC_SYNC_IGNORE_INTERVAL option, to force a sync.
# Using $BWDC_SCAN_SLEEP_DUR in the parent process for now.

#currInterval=$(jq .syncConfig.interval data.json)

# Enforce minimumm interval between syncs per profile
#[ $BWDC_SYNC_INTERVAL_MIN -gt $currInterval ] && currInterval=$BWDC_SYNC_INTERVAL_MIN

#echo "currInterval (ignored for now):" $currInterval

echo "Starting sync for: ${BWDC_PROFILENAME}"
bwdc sync

# Print relevant info
echo "bwdc last-sync users: $(bwdc last-sync users)"
echo "bwdc last-sync groups: $(bwdc last-sync groups)"

