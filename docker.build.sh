#!/bin/bash
set -e

BWDC_VERSION=2.9.8

DOCKER_BUILDKIT=1 docker build . --label com.bitwarden.product="bitwarden" --build-arg BWDC_VERSION -t bitwarden/directory-connector:${BWDC_VERSION}-containerise_v1.1 #--no-cache # --squash --pull

