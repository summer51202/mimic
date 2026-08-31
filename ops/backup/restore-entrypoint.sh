#!/bin/sh
set -eu

umask 077
if [ -t 0 ]; then
  printf '%s\n' 'The age identity must be supplied on stdin' >&2
  exit 2
fi
identity="$(mktemp "${TMPDIR:-/tmp}/mimic-age-identity.XXXXXX")"
cleanup() { rm -f "$identity"; }
trap cleanup EXIT
trap 'exit 1' HUP INT TERM
dd of="$identity" status=none
if [ ! -s "$identity" ]; then
  printf '%s\n' 'The age identity supplied on stdin is empty' >&2
  exit 2
fi
export MIMIC_BACKUP_AGE_IDENTITY_FILE="$identity"
/opt/mimic/restore-drill.sh
