FROM node:gallium-bullseye-slim	
# Gallium: v16 and lts
# bullseye: Debian Stable

LABEL com.bitwarden.product="bitwarden"

# Default syncprofile/folder for bwdc
ENV BWDC_PROFILES_DIR='/data/bwdc-profiles/'
ENV BITWARDENCLI_CONNECTOR_APPDATA_DIR="${BWDC_PROFILES_DIR}syncprofile_1"

ENV BITWARDENCLI_CONNECTOR_PLAINTEXT_SECRETS=true

WORKDIR /app
ENV PATH="/app:${PATH}"

ARG BWDC_VERSION=2.9.8
ENV BWDC_VERSION=${BWDC_VERSION}

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gosu \
        curl \
        unzip \
        jq \ 
        libsecret-1-0 \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Download and Install BWDC
RUN curl -Lo bwdc-linux.zip \
"https://github.com/bitwarden/directory-connector/releases/download/v${BWDC_VERSION}/bwdc-linux-${BWDC_VERSION}.zip" \
    && unzip bwdc-linux.zip \
    && rm bwdc-linux.zip \
    && chmod 700 bwdc && chmod 700 keytar.node \
    && echo "Bitwarden Directory Connector Version: " bwdc --version

COPY --chown=1000:1000 dockerfiles/ .
RUN chmod -R +x /app

RUN mv entrypoint.sh /

ENTRYPOINT ["/entrypoint.sh"]