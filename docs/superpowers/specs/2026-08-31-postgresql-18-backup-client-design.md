# PostgreSQL 18 Backup Client Design

## Goal

Align Mimic's encrypted backup and restore image with the PostgreSQL 18 server
already running in Railway Staging, while preserving the existing fail-closed
backup, signing, encryption, and scratch-restore controls.

## Scope

This change upgrades only the repository-owned backup/restore toolchain:

- pin the base image to
  `alpine:3.23.5@sha256:fd791d74b68913cbb027c6546007b3f0d3bc45125f797758156952bc2d6daf40`;
- change the Docker build argument default from `POSTGRES_MAJOR=16` to
  `POSTGRES_MAJOR=18`;
- update the backup image contract, production-image allowlist, Linux shell
  fixtures, and CI runtime assertions to require PostgreSQL 18;
- update the PostgreSQL recovery runbook and feature/devlog records to describe
  the PG18-ready state.

The change does not create a Railway backup service, schedule a cron, provision
an external bucket, create database credentials, handle secret values, enable
Production, or change the backup artifact format.

## Base Image Decision

Alpine 3.22 does not publish `postgresql18-client`. Alpine 3.23 is the first
stable Alpine release that includes PostgreSQL 18, so the backup image must move
to the supported 3.23 line. Use the current supported patch release 3.23.5 and
pin the multi-platform manifest digest above. Do not use `edge`, a floating
`3.23` tag, or Alpine 3.24 as part of this focused compatibility change.

The `POSTGRES_MAJOR` build argument remains available for local diagnostics, but
the repository contract and CI production build require its default and runtime
value to be exactly `18`. A build override is not an approved production image.

## Runtime Contract

The resulting image must retain the current non-root user, file permissions,
entrypoint behavior, encryption-before-upload sequence, signature-last publish
sequence, and restore safety checks. It must install Alpine's
`postgresql18-client` package and expose:

- `MIMIC_POSTGRES_CLIENT_MAJOR=18`;
- `pg_dump (PostgreSQL) 18.x`;
- `pg_restore (PostgreSQL) 18.x`.

Backup and restore continue to fail closed unless the source server, client,
signed manifest, scratch server, and restore client all report major 18. The
fixture patch version is 18.6 (`server_version_num=180006`), matching the
package currently published in Alpine v3.23, but production logic compares only
the major.

## Test-Driven Change Sequence

1. Change the backup image contract, production-image allowlist test, shell
   fixtures, and CI expectations from 16 to 18 before changing the Dockerfile.
2. Run the focused tests and confirm they fail because the Dockerfile and
   documentation still declare Alpine 3.22/PostgreSQL 16.
3. Update the Dockerfile and runbook with the pinned Alpine 3.23.5 digest and
   PostgreSQL 18 commands.
4. Run Node contracts on Windows and the complete Linux-only shell semantics in
   CI or a Linux container environment.
5. Build the image in CI and assert the runtime environment plus `pg_dump` and
   `pg_restore` major versions are all 18.
6. Run the repository naming check, `git diff --check`, and the existing
   immutable production-image contracts before completion.

## Failure Handling

- If the pinned digest does not resolve to Alpine 3.23.5, stop rather than
  substituting a floating tag.
- If `postgresql18-client` cannot be installed from the stable v3.23 repository,
  stop rather than enabling Alpine edge or adding an unreviewed repository.
- If any shell guard or restore-semantics test changes for a reason other than
  the PostgreSQL version fixture, keep the existing behavior and investigate.
- If a real image build reports a client major other than 18, do not publish or
  deploy the image.

## Verification Evidence

Completion requires all of the following:

- backup contracts pass, with POSIX-only tests passing in Linux CI;
- immutable production-image tests pass;
- the backup image builds successfully from the pinned digest;
- container checks confirm `MIMIC_POSTGRES_CLIENT_MAJOR=18`, `pg_dump` major 18,
  and `pg_restore` major 18;
- recovery documentation contains no active PG16 build instruction or PG16
  deployment gate;
- no Railway resource or Production environment has been changed.

## References

- Alpine 3.23 release: <https://www.alpinelinux.org/posts/Alpine-3.23.0-released.html>
- Alpine v3.23 PostgreSQL 18 client package: <https://pkgs.alpinelinux.org/package/v3.23/main/x86_64/postgresql18-client>
- Docker Official Alpine tags: <https://hub.docker.com/_/alpine/tags>
- PostgreSQL 18 `pg_dump` compatibility: <https://www.postgresql.org/docs/18/app-pgdump.html>
