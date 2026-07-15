# Type Selection Guidance

## feat

Use `feat` when the change introduces new behavior, new capability, or new user-facing functionality.

Examples:

- new API
- new CLI option
- new module behavior
- new export format
- new logging feature visible to users or developers

## fix

Use `fix` when the change corrects incorrect behavior.

Examples:

- bug fix
- edge-case handling
- null or empty checks
- wrong output correction
- broken path handling
- crash prevention

## perf

Use `perf` when the main purpose is improving performance without changing intended behavior.

Examples:

- reduce allocations
- improve batching
- optimize loop
- improve caching
- reduce latency

## refactor

Use `refactor` when the code structure changes but intended behavior does not.

Examples:

- extract helper
- rename internal logic
- simplify control flow
- move logic across files
- reorganize structure

## docs

Use `docs` for documentation-only changes.

Examples:

- README
- architecture notes
- usage docs
- inline documentation only when code meaning does not change

## test

Use `test` for test-only changes.

Examples:

- add missing tests
- update assertions
- fix broken tests
- improve test coverage

## build

Use `build` for build system, packaging, toolchain, or dependency-related changes.

Examples:

- CMakeLists.txt
- Docker build changes
- package config
- compiler flags
- external dependency versions

## ci

Use `ci` for CI/CD workflow updates.

Examples:

- GitHub Actions
- GitLab CI
- pipeline scripts
- CI runner config

## style

Use `style` only when the change is formatting-only and has no meaning change.

Examples:

- whitespace
- import sorting
- formatting
- lint-only rewrite with no logic change

## chore

Use `chore` only for maintenance changes that do not fit better types.

Examples:

- repo housekeeping
- non-source maintenance
- editor config
- ignore file updates not tied to behavior

## revert

Use `revert` only when the diff explicitly reverts an earlier commit or rollback is clearly stated.
