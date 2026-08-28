FROM alpine:3.22.2

ARG POSTGRES_MAJOR=16
RUN apk add --no-cache age aws-cli minisign postgresql${POSTGRES_MAJOR}-client
RUN addgroup -g 10001 -S mimic && adduser -u 10001 -S -G mimic mimic

ENV MIMIC_POSTGRES_CLIENT_MAJOR=$POSTGRES_MAJOR
WORKDIR /opt/mimic
COPY --chown=mimic:mimic backup.sh restore-drill.sh restore-entrypoint.sh provision-scratch.sql verify-restore.sql ./
RUN chmod 0555 backup.sh restore-drill.sh restore-entrypoint.sh && chmod 0444 provision-scratch.sql verify-restore.sql

USER mimic
CMD ["/opt/mimic/backup.sh"]
