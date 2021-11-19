#!/bin/bash

# Setup

GROUPNAME="bitwarden"
USERNAME="bitwarden"

LUID=${LOCAL_UID:-0}
LGID=${LOCAL_GID:-0}

# Step down from host root to well-known nobody/nogroup user

if [ $LUID -eq 0 ]
then
    LUID=65534
fi
if [ $LGID -eq 0 ]
then
    LGID=65534
fi

# Create user and group

groupadd -o -g $LGID $GROUPNAME >/dev/null 2>&1 ||
groupmod -o -g $LGID $GROUPNAME >/dev/null 2>&1
useradd -o -u $LUID -g $GROUPNAME -s /bin/false $USERNAME >/dev/null 2>&1 ||
usermod -o -u $LUID -g $GROUPNAME -s /bin/false $USERNAME >/dev/null 2>&1
mkhomedir_helper $USERNAME


export BITWARDENCLI_CONNECTOR_APPDATA_DIR=${BITWARDENCLI_CONNECTOR_APPDATA_DIR:-'/bwdc-data/syncprofile_1'}
mkdir -p $BITWARDENCLI_CONNECTOR_APPDATA_DIR     # Default folder
chown -R $USERNAME:$GROUPNAME /etc/bitwarden

gosu $USERNAME:$GROUPNAME /bin/sh -c "/bwdc-sync-profiles.sh loop >/dev/null 2>&1 &"