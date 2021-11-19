FROM node:gallium-bullseye-slim	
# Gallium: v16 and lts
# bullseye: Debian Stable

ARG BWDC_VERSION=2.9.8
ENV BWDC_VERSION=${BWDC_VERSION}


LABEL com.bitwarden.product="bitwarden"

WORKDIR /dockerbuild

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
'https://github.com/bitwarden/directory-connector/releases/download/v${BWDC_VERSION}/bwdc-linux-${BWDC_VERSION}.zip' \
    && unzip bwdc-linux.zip \
    && rm bwdc-linux.zip \
    && chmod 700 bwdc && chmod 700 keytar.node \
    && mv bwdc /bin/ && mv keytar.node /bin/ \
    && echo "Bitwarden Directory Connector Version: " bwdc --version

COPY dockerfiles/ /

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]