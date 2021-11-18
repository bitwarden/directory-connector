FROM alpine:latest

LABEL com.bitwarden.product="bitwarden"


RUN 



COPY dockerfiles/ /


RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]