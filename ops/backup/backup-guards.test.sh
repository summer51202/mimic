#!/bin/sh
set -eu

workdir="$(mktemp -d "${TMPDIR:-/tmp}/mimic-guard-test.XXXXXX")"
cleanup() {
  rm -rf "$workdir"
}
trap cleanup EXIT

fakebin="${workdir}/bin"
mkdir "$fakebin"
marker="${workdir}/aws-called"
identity="${workdir}/identity.txt"
error_log="${workdir}/stderr.log"
printf '%s\n' 'test identity material' > "$identity"

cat > "${fakebin}/psql" <<'EOF'
#!/bin/sh
case "$*" in
  *pg_control_system*) printf '%s\n' "$MIMIC_TEST_SYSTEM_ID" ;;
  *obj_description*) printf '%s\n' "$MIMIC_TEST_SENTINEL" ;;
  *current_database*) printf '%s\n' 'mimic_hostile_restore_drill' ;;
  *) exit 91 ;;
esac
EOF
cat > "${fakebin}/aws" <<EOF
#!/bin/sh
touch "$marker"
exit 92
EOF
chmod 0700 "${fakebin}/psql" "${fakebin}/aws"

export PATH="${fakebin}:$PATH"
export MIMIC_BACKUP_OBJECT='weekly/mimic-20260828T030000Z-0123456789abcdef0123456789abcdef.dump.age'
export MIMIC_BACKUP_S3_ENDPOINT='https://storage.invalid'
export MIMIC_BACKUP_S3_BUCKET='mimic-test'
export MIMIC_BACKUP_AGE_IDENTITY_FILE="$identity"
export MIMIC_BACKUP_MINISIGN_PUBLIC_KEY='RWQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
export MIMIC_RESTORE_DATABASE_URL='postgresql://placeholder.invalid/mimic_hostile_restore_drill'
export MIMIC_RESTORE_DATABASE_NAME='mimic_hostile_restore_drill'
export MIMIC_RESTORE_ENVIRONMENT='staging-scratch'
export MIMIC_RESTORE_CONFIRM='RESTORE-INTO-SCRATCH'
export MIMIC_RESTORE_SENTINEL_NONCE='0123456789abcdef0123456789abcdef'
export MIMIC_RESTORE_SYSTEM_IDENTIFIER='2222222222222222222'
export MIMIC_PRODUCTION_SYSTEM_IDENTIFIER='1111111111111111111'
export MIMIC_TEST_SYSTEM_ID='2222222222222222222'
export MIMIC_TEST_SENTINEL='mimic-restore-scratch:wrong-nonce'
export MIMIC_POSTGRES_CLIENT_MAJOR='16'
export MIMIC_EXPECTED_MIGRATION='20260715125137_init'
export MIMIC_EXPECTED_RELEASE='test-release'
export AWS_ACCESS_KEY_ID='placeholder'
export AWS_SECRET_ACCESS_KEY='placeholder'
export AWS_DEFAULT_REGION='test-region'

expect_rejection() {
  expected="$1"
  rm -f "$marker" "$error_log"
  if "$(dirname "$0")/restore-drill.sh" 2> "$error_log"; then
    printf '%s\n' 'restore unexpectedly accepted a hostile target' >&2
    exit 1
  fi
  if [ -e "$marker" ]; then
    printf '%s\n' 'restore reached object storage before rejecting the target' >&2
    exit 1
  fi
  if ! grep -q "$expected" "$error_log"; then
    printf '%s\n' 'restore did not report the expected target rejection' >&2
    sed 's/postgresql:\/\/[^ ]*/[redacted]/g' "$error_log" >&2
    exit 1
  fi
}

expect_rejection 'scratch sentinel'

export MIMIC_TEST_SENTINEL="mimic-restore-scratch:${MIMIC_RESTORE_SENTINEL_NONCE}"
export MIMIC_RESTORE_SYSTEM_IDENTIFIER='3333333333333333333'
export MIMIC_PRODUCTION_SYSTEM_IDENTIFIER='2222222222222222222'
expect_rejection 'Production PostgreSQL system identity'

printf '%s\n' 'hostile restore guard test passed'
