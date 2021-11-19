#!/bin/bash

echo "Setting up the container"

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

echo "Attempting to setup non root U/GID $LUID:$LGID ($USERNAME:$GROUPNAME)"
groupadd -o -g $LGID $GROUPNAME >/dev/null 2>&1 ||
groupmod -o -g $LGID $GROUPNAME >/dev/null 2>&1
useradd -o -u $LUID -g $GROUPNAME -s /bin/false $USERNAME >/dev/null 2>&1 ||
usermod -o -u $LUID -g $GROUPNAME -s /bin/false $USERNAME >/dev/null 2>&1
mkhomedir_helper $USERNAME
gosu $USERNAME:$GROUPNAME /bin/bash -c "echo id: $(id); echo HOME: $HOME"


echo "mkdir && chown directories to the above users."
mkdir -p $BITWARDENCLI_CONNECTOR_APPDATA_DIR        # Default folder, declared container wide
chown -R $USERNAME:$GROUPNAME /bwdc-profiles

mkdir -p /etc/bitwarden                             # Placeholder to mimic most of the other Bitwarden images
chown -R $USERNAME:$GROUPNAME /etc/bitwarden

chown -R $USERNAME:$GROUPNAME /app

echo "Over to scan-profiles.sh loop"
gosu $USERNAME:$GROUPNAME /bin/bash -c "scan-profiles.sh loop"

