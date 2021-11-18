FROM ubuntu:20.04

LABEL com.bitwarden.product="bitwarden"


RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gosu \
        curl \
        jq \ 
        libsecret-1-0 \
    && rm -rf /var/lib/apt/lists/*



COPY dockerfiles/ /


RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]