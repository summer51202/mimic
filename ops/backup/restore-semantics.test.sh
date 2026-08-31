#!/bin/sh
set -eu

workdir="$(mktemp -d "${TMPDIR:-/tmp}/mimic-restore-semantics.XXXXXX")"
cleanup() { rm -rf "$workdir"; }
trap cleanup EXIT
fakebin="${workdir}/bin"
mkdir "$fakebin"
identity="${workdir}/identity"
restore_marker="${workdir}/restored"
verify_marker="${workdir}/verified"
restore_tmp="${workdir}/restore-tmp"
mkdir "$restore_tmp"
printf '%s\n' 'fixture identity' > "$identity"
payload_hash="$(printf '%s' 'encrypted fixture' | sha256sum | sed -n 's/ .*//p')"

cat > "${fakebin}/psql" <<'EOF'
#!/bin/sh
[ -z "${PGDATABASE+x}" ] || exit 79
[ -z "${MIMIC_RESTORE_DATABASE_PASSWORD+x}" ] || exit 80
[ -z "${AWS_ACCESS_KEY_ID+x}" ] || exit 77
case "$*" in *--dbname=service=mimic_restore*) ;; *) exit 81 ;; esac
[ -f "$PGSERVICEFILE" ] || exit 82
case "$*" in
  *pg_control_system*) printf '%s\n' '2222222222222222222' ;;
  *obj_description*) printf '%s\n' 'mimic-restore-scratch:0123456789abcdef0123456789abcdef' ;;
  *current_database\(\)*) printf '%s\n' 'mimic_semantics_restore_drill' ;;
  *server_version_num*) printf '%s\n' '180006' ;;
  *verify-restore.sql*)
    touch "$MIMIC_TEST_VERIFY_MARKER"
    ;;
  *) exit 78 ;;
esac
EOF
cat > "${fakebin}/pg_restore" <<'EOF'
#!/bin/sh
if [ "${1:-}" = '--version' ]; then
  printf '%s\n' 'pg_restore (PostgreSQL) 18.6'
  exit 0
fi
[ -z "${PGDATABASE+x}" ] || exit 79
[ -z "${MIMIC_RESTORE_DATABASE_PASSWORD+x}" ] || exit 80
[ -z "${AWS_ACCESS_KEY_ID+x}" ] || exit 77
case "$*" in *--dbname=service=mimic_restore*) ;; *) exit 83 ;; esac
case "$*" in *postgresql://*) exit 84 ;; esac
[ -f "$PGSERVICEFILE" ] || exit 85
[ "$(stat -c '%a' "$PGSERVICEFILE")" = '600' ] || exit 86
grep -q '^\[mimic_restore\]$' "$PGSERVICEFILE" || exit 87
grep -q '^host=scratch.internal$' "$PGSERVICEFILE" || exit 88
grep -q '^port=5432$' "$PGSERVICEFILE" || exit 89
grep -q '^user=mimic_restore$' "$PGSERVICEFILE" || exit 93
grep -q '^password=password-placeholder$' "$PGSERVICEFILE" || exit 94
grep -q '^dbname=mimic_semantics_restore_drill$' "$PGSERVICEFILE" || exit 95
grep -q '^sslmode=require$' "$PGSERVICEFILE" || exit 96
touch "$MIMIC_TEST_RESTORE_MARKER"
EOF
cat > "${fakebin}/aws" <<'EOF'
#!/bin/sh
: "${AWS_ACCESS_KEY_ID:?scoped AWS access key missing}"
: "${AWS_SECRET_ACCESS_KEY:?scoped AWS secret key missing}"
: "${AWS_DEFAULT_REGION:?scoped AWS region missing}"
while [ "$1" != 'cp' ]; do shift; done
shift
source_object="$1"
destination="$2"
case "$source_object" in
  *.manifest.minisig) printf '%s\n' 'fixture signature' > "$destination" ;;
  *.manifest)
    cat > "$destination" <<MANIFEST
format=mimic-backup-v1
object=${MIMIC_BACKUP_OBJECT}
created_at=20260828T030000Z
source_postgres_version_num=180006
postgres_major=18
expected_migration=20260715125137_init
release=test-release
sha256=${MIMIC_TEST_PAYLOAD_HASH}
MANIFEST
    ;;
  *.sha256) printf '%s  %s\n' "$MIMIC_TEST_PAYLOAD_HASH" "${MIMIC_BACKUP_OBJECT#weekly/}" > "$destination" ;;
  *.dump.age) printf '%s' 'encrypted fixture' > "$destination" ;;
  *) exit 89 ;;
esac
EOF
cat > "${fakebin}/minisign" <<'EOF'
#!/bin/sh
exit 0
EOF
cat > "${fakebin}/age" <<'EOF'
#!/bin/sh
while [ "$1" != '--output' ]; do shift; done
shift
output="$1"
printf '%s' 'fixture dump' > "$output"
EOF
chmod 0700 "${fakebin}/psql" "${fakebin}/pg_restore" "${fakebin}/aws" "${fakebin}/minisign" "${fakebin}/age"

export PATH="${fakebin}:$PATH"
export TMPDIR="$restore_tmp"
export MIMIC_TEST_RESTORE_MARKER="$restore_marker"
export MIMIC_TEST_VERIFY_MARKER="$verify_marker"
export MIMIC_TEST_PAYLOAD_HASH="$payload_hash"
export MIMIC_BACKUP_OBJECT='weekly/mimic-20260828T030000Z-0123456789abcdef0123456789abcdef.dump.age'
export MIMIC_BACKUP_S3_ENDPOINT='https://storage.invalid'
export MIMIC_BACKUP_S3_BUCKET='mimic-test'
export MIMIC_BACKUP_AGE_IDENTITY_FILE="$identity"
export MIMIC_BACKUP_MINISIGN_PUBLIC_KEY='public-key-placeholder'
export MIMIC_RESTORE_DATABASE_HOST='scratch.internal'
export MIMIC_RESTORE_DATABASE_PORT='5432'
export MIMIC_RESTORE_DATABASE_USER='mimic_restore'
export MIMIC_RESTORE_DATABASE_PASSWORD='password-placeholder'
export MIMIC_RESTORE_DATABASE_NAME='mimic_semantics_restore_drill'
export MIMIC_RESTORE_DATABASE_SSL_MODE='require'
export MIMIC_RESTORE_ENVIRONMENT='staging-scratch'
export MIMIC_RESTORE_CONFIRM='RESTORE-INTO-SCRATCH'
export MIMIC_RESTORE_SENTINEL_NONCE='0123456789abcdef0123456789abcdef'
export MIMIC_RESTORE_SYSTEM_IDENTIFIER='2222222222222222222'
export MIMIC_PRODUCTION_SYSTEM_IDENTIFIER='1111111111111111111'
export MIMIC_POSTGRES_CLIENT_MAJOR='18'
export MIMIC_EXPECTED_MIGRATION='20260715125137_init'
export MIMIC_EXPECTED_RELEASE='test-release'
export AWS_ACCESS_KEY_ID='placeholder'
export AWS_SECRET_ACCESS_KEY='placeholder'
export AWS_DEFAULT_REGION='test-region'

"$(dirname "$0")/restore-drill.sh"
[ -e "$restore_marker" ] || exit 90
[ -e "$verify_marker" ] || exit 91
[ -z "$(find "$restore_tmp" -mindepth 1 -print -quit)" ] || exit 92
printf '%s\n' 'direct restore semantics test passed'
