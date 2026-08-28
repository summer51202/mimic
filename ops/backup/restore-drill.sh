#!/bin/sh
set -eu

umask 077

: "${MIMIC_BACKUP_OBJECT:?MIMIC_BACKUP_OBJECT is required}"
: "${MIMIC_BACKUP_S3_ENDPOINT:?MIMIC_BACKUP_S3_ENDPOINT is required}"
: "${MIMIC_BACKUP_S3_BUCKET:?MIMIC_BACKUP_S3_BUCKET is required}"
: "${MIMIC_BACKUP_AGE_IDENTITY_FILE:?MIMIC_BACKUP_AGE_IDENTITY_FILE is required}"
: "${MIMIC_BACKUP_MINISIGN_PUBLIC_KEY:?MIMIC_BACKUP_MINISIGN_PUBLIC_KEY is required}"
: "${MIMIC_RESTORE_DATABASE_URL:?MIMIC_RESTORE_DATABASE_URL is required}"
: "${MIMIC_RESTORE_DATABASE_NAME:?MIMIC_RESTORE_DATABASE_NAME is required}"
: "${MIMIC_RESTORE_ENVIRONMENT:?MIMIC_RESTORE_ENVIRONMENT is required}"
: "${MIMIC_RESTORE_CONFIRM:?MIMIC_RESTORE_CONFIRM is required}"
: "${MIMIC_RESTORE_SENTINEL_NONCE:?MIMIC_RESTORE_SENTINEL_NONCE is required}"
: "${MIMIC_RESTORE_SYSTEM_IDENTIFIER:?MIMIC_RESTORE_SYSTEM_IDENTIFIER is required}"
: "${MIMIC_PRODUCTION_SYSTEM_IDENTIFIER:?MIMIC_PRODUCTION_SYSTEM_IDENTIFIER is required}"
: "${MIMIC_POSTGRES_CLIENT_MAJOR:?MIMIC_POSTGRES_CLIENT_MAJOR is required}"
: "${MIMIC_EXPECTED_MIGRATION:?MIMIC_EXPECTED_MIGRATION is required}"
: "${MIMIC_EXPECTED_RELEASE:?MIMIC_EXPECTED_RELEASE is required}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is required}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is required}"
: "${AWS_DEFAULT_REGION:?AWS_DEFAULT_REGION is required}"

case "$MIMIC_BACKUP_S3_ENDPOINT" in https://*) ;; *) printf '%s\n' 'Backup endpoint must use HTTPS' >&2; exit 2 ;; esac
case "$MIMIC_BACKUP_S3_BUCKET" in ''|*[!A-Za-z0-9._-]*) printf '%s\n' 'Backup bucket is invalid' >&2; exit 2 ;; esac
case "$MIMIC_BACKUP_OBJECT" in
  weekly/mimic-[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]T[0-9][0-9][0-9][0-9][0-9][0-9]Z-[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f].dump.age) ;;
  *) printf '%s\n' 'Refusing invalid backup object' >&2; exit 2 ;;
esac
if [ "$MIMIC_RESTORE_CONFIRM" != 'RESTORE-INTO-SCRATCH' ] || [ "$MIMIC_RESTORE_ENVIRONMENT" != 'staging-scratch' ]; then
  printf '%s\n' 'Refusing restore without staging scratch confirmation' >&2
  exit 2
fi
case "$MIMIC_RESTORE_DATABASE_NAME" in *prod*|*production*) printf '%s\n' 'Refusing production-like database name' >&2; exit 2 ;; mimic_*_restore_drill) ;; *) printf '%s\n' 'Restore database name must match mimic_*_restore_drill' >&2; exit 2 ;; esac
case "$MIMIC_RESTORE_DATABASE_NAME" in *[!a-z0-9_]*) printf '%s\n' 'Restore database name is invalid' >&2; exit 2 ;; esac
case "$MIMIC_RESTORE_SENTINEL_NONCE" in
  [0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]) ;;
  *) printf '%s\n' 'Scratch sentinel nonce must be 128-bit lowercase hex' >&2; exit 2 ;;
esac
case "$MIMIC_RESTORE_SYSTEM_IDENTIFIER:$MIMIC_PRODUCTION_SYSTEM_IDENTIFIER:$MIMIC_POSTGRES_CLIENT_MAJOR" in *[!0-9:]*) printf '%s\n' 'PostgreSQL identities and major must be numeric' >&2; exit 2 ;; esac
if [ "$MIMIC_RESTORE_SYSTEM_IDENTIFIER" = "$MIMIC_PRODUCTION_SYSTEM_IDENTIFIER" ]; then printf '%s\n' 'Refusing restore because scratch and Production identities match' >&2; exit 2; fi
case "$MIMIC_EXPECTED_MIGRATION:$MIMIC_EXPECTED_RELEASE" in *[!0-9A-Za-z._:-]*) printf '%s\n' 'Expected migration or release is invalid' >&2; exit 2 ;; esac
if [ ! -r "$MIMIC_BACKUP_AGE_IDENTITY_FILE" ]; then printf '%s\n' 'The age identity file is not readable' >&2; exit 2; fi
if [ "$(printf '%s' "$MIMIC_RESTORE_DATABASE_URL" | tr -d '\r\n')" != "$MIMIC_RESTORE_DATABASE_URL" ]; then
  printf '%s\n' 'Restore database URL must be a single line' >&2
  exit 2
fi

export AWS_EC2_METADATA_DISABLED=true
name="${MIMIC_BACKUP_OBJECT#weekly/}"
workdir="$(mktemp -d "${TMPDIR:-/tmp}/mimic-restore.XXXXXX")"
service_name=mimic_restore
service_file="${workdir}/pg_service.conf"
encrypted="${workdir}/${name}"
checksum="${encrypted}.sha256"
manifest="${encrypted}.manifest"
signature="${manifest}.minisig"
plain="${encrypted%.age}"
cleanup() { rm -rf "$workdir"; }
trap cleanup EXIT
trap 'exit 1' HUP INT TERM
printf '[%s]\ndbname=%s\n' "$service_name" "$MIMIC_RESTORE_DATABASE_URL" > "$service_file"
chmod 0600 "$service_file"
unset MIMIC_RESTORE_DATABASE_URL
actual_database="$(PGSERVICEFILE="$service_file" psql --dbname="service=${service_name}" --tuples-only --no-align --set=ON_ERROR_STOP=1 --command='SELECT current_database()')"
actual_system_id="$(PGSERVICEFILE="$service_file" psql --dbname="service=${service_name}" --tuples-only --no-align --set=ON_ERROR_STOP=1 --command='SELECT system_identifier::text FROM pg_control_system()')"
actual_sentinel="$(PGSERVICEFILE="$service_file" psql --dbname="service=${service_name}" --tuples-only --no-align --set=ON_ERROR_STOP=1 --command="SELECT COALESCE(obj_description(oid, 'pg_database'), '') FROM pg_database WHERE datname=current_database()")"
if [ "$actual_database" != "$MIMIC_RESTORE_DATABASE_NAME" ]; then printf '%s\n' 'Refusing mismatched scratch database name' >&2; exit 2; fi
if [ "$actual_system_id" != "$MIMIC_RESTORE_SYSTEM_IDENTIFIER" ] || [ "$actual_system_id" = "$MIMIC_PRODUCTION_SYSTEM_IDENTIFIER" ]; then printf '%s\n' 'Refusing mismatched or Production PostgreSQL system identity' >&2; exit 2; fi
if [ "$actual_sentinel" != "mimic-restore-scratch:${MIMIC_RESTORE_SENTINEL_NONCE}" ]; then printf '%s\n' 'Refusing mismatched scratch sentinel' >&2; exit 2; fi
target_version_num="$(PGSERVICEFILE="$service_file" psql --dbname="service=${service_name}" --tuples-only --no-align --set=ON_ERROR_STOP=1 --command='SHOW server_version_num')"
case "$target_version_num" in ''|*[!0-9]*) printf '%s\n' 'Unable to determine target PostgreSQL version' >&2; exit 2 ;; esac
target_major=$((target_version_num / 10000))
client_major="$(pg_restore --version | sed -n 's/.* \([0-9][0-9]*\)\..*/\1/p')"
if [ "$target_major" != "$MIMIC_POSTGRES_CLIENT_MAJOR" ] || [ "$client_major" != "$MIMIC_POSTGRES_CLIENT_MAJOR" ]; then printf '%s\n' 'Refusing restore across PostgreSQL major versions' >&2; exit 2; fi

aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3 cp "s3://${MIMIC_BACKUP_S3_BUCKET}/${MIMIC_BACKUP_OBJECT}.manifest" "$manifest" --only-show-errors
aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3 cp "s3://${MIMIC_BACKUP_S3_BUCKET}/${MIMIC_BACKUP_OBJECT}.manifest.minisig" "$signature" --only-show-errors
minisign -V -q -P "$MIMIC_BACKUP_MINISIGN_PUBLIC_KEY" -m "$manifest" -x "$signature"

manifest_field() {
  field="$1"
  if [ "$(grep -c "^${field}=" "$manifest")" != '1' ]; then printf '%s\n' 'Refusing malformed signed manifest' >&2; exit 2; fi
  sed -n "s/^${field}=//p" "$manifest"
}
if [ "$(wc -l < "$manifest" | tr -d ' ')" != '8' ] || [ "$(manifest_field format)" != 'mimic-backup-v1' ]; then printf '%s\n' 'Refusing unsupported signed manifest' >&2; exit 2; fi
manifest_object="$(manifest_field object)"
manifest_source_version="$(manifest_field source_postgres_version_num)"
manifest_major="$(manifest_field postgres_major)"
manifest_migration="$(manifest_field expected_migration)"
manifest_release="$(manifest_field release)"
manifest_sha256="$(manifest_field sha256)"
manifest_field created_at >/dev/null
case "$manifest_sha256" in
  [0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]) ;; *) printf '%s\n' 'Refusing invalid signed hash' >&2; exit 2 ;; esac
case "$manifest_source_version" in ''|*[!0-9]*) printf '%s\n' 'Refusing invalid signed PostgreSQL version' >&2; exit 2 ;; esac
if [ "$manifest_object" != "$MIMIC_BACKUP_OBJECT" ] || [ "$manifest_major" != "$MIMIC_POSTGRES_CLIENT_MAJOR" ] || [ "$((manifest_source_version / 10000))" != "$target_major" ] || [ "$manifest_migration" != "$MIMIC_EXPECTED_MIGRATION" ] || [ "$manifest_release" != "$MIMIC_EXPECTED_RELEASE" ]; then printf '%s\n' 'Refusing signed backup identity or version mismatch' >&2; exit 2; fi

aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3 cp "s3://${MIMIC_BACKUP_S3_BUCKET}/${MIMIC_BACKUP_OBJECT}" "$encrypted" --only-show-errors
aws --endpoint-url "$MIMIC_BACKUP_S3_ENDPOINT" s3 cp "s3://${MIMIC_BACKUP_S3_BUCKET}/${MIMIC_BACKUP_OBJECT}.sha256" "$checksum" --only-show-errors
if ! awk 'NF != 2 { exit 1 }' "$checksum" || [ "$(sed -n 's/ .*//p' "$checksum")" != "$manifest_sha256" ] || [ "$(sed -n 's/^[0-9a-f]*  //p' "$checksum")" != "$name" ]; then printf '%s\n' 'Refusing checksum not authenticated by manifest' >&2; exit 2; fi
(cd "$workdir" && sha256sum --check "${name}.sha256")
age --decrypt --identity "$MIMIC_BACKUP_AGE_IDENTITY_FILE" --output "$plain" "$encrypted"
PGSERVICEFILE="$service_file" pg_restore --dbname="service=${service_name}" --exit-on-error --no-acl --no-owner --clean --if-exists "$plain"
PGSERVICEFILE="$service_file" psql --dbname="service=${service_name}" --set=ON_ERROR_STOP=1 --set=expected_migration="$MIMIC_EXPECTED_MIGRATION" --set=expected_release="$MIMIC_EXPECTED_RELEASE" --file="/opt/mimic/verify-restore.sql"
