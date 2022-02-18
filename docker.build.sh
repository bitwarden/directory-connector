#!/bin/bash
set -e

BWDC_VERSION=2.9.10
export BUILD_TAG=bitwarden/directory-connector:${BWDC_VERSION}-containerise_v3.0.1


DOCKER_BUILDKIT=1 docker build --progress=plain . --label com.bitwarden.product="bitwarden" --build-arg BWDC_VERSION -t ${BUILD_TAG} --rm #--no-cache # --squash --pull

    # export ENV="dev" when testing
[ "dev" == "$ENV" ] && docker-compose -f docker-compose.example.yml up -d
