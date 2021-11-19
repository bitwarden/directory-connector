#!/bin/bash

BWDC_VERSION=2.9.8

echo "Work in progress, not executable yet! Exiting..."
exit



curl -Lo bwdc-linux.zip \
"https://github.com/bitwarden/directory-connector/releases/download/v${BWDC_VERSION}/bwdc-linux-${BWDC_VERSION}.zip"

unzip bwdc-linux.zip
rm bwdc-linux.zip
chmod 700 bwdc && chmod 700 keytar.node
echo "Bitwarden Directory Connector Version: " bwdc --version