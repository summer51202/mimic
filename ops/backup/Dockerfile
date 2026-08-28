FROM alpine:3.22.2

RUN apk add --no-cache age aws-cli postgresql16-client
RUN addgroup -S mimic && adduser -S -G mimic mimic

WORKDIR /opt/mimic
COPY --chown=mimic:mimic backup.sh restore-drill.sh verify-restore.sql ./
RUN chmod 0555 backup.sh restore-drill.sh && chmod 0444 verify-restore.sql

USER mimic
CMD ["/opt/mimic/backup.sh"]
