# Diff Analysis Heuristics

Use the following heuristics when inferring commit intent.

## Feature Indicators

Likely `feat`:

- new file introducing capability
- new public function
- new API route
- new command-line option
- new output mode
- new integration path

## Fix Indicators

Likely `fix`:

- null check
- bounds check
- error handling correction
- crash fix
- incorrect conditional correction
- wrong data handling correction
- broken resource cleanup
- incorrect path or config handling

## Performance Indicators

Likely `perf`:

- reduced copies
- reduced allocations
- batching changes
- caching optimization
- memory reuse
- algorithmic optimization
- lower latency path
- better concurrency usage

## Refactor Indicators

Likely `refactor`:

- extract function
- rename internal components
- move code without behavior change
- simplify branching
- improve layering
- separate responsibilities

## Docs Indicators

Likely `docs`:

- README update
- usage examples
- architecture docs
- markdown-only changes

## Test Indicators

Likely `test`:

- add tests
- change assertions
- update fixtures
- change only test behavior or coverage

## Build Indicators

Likely `build`:

- CMakeLists.txt
- Dockerfile
- build script
- package manifest
- dependency version file
- linker/compiler settings

## CI Indicators

Likely `ci`:

- .github/workflows/*
- .gitlab-ci.yml
- pipeline scripts
- CI job templates

## Style Indicators

Likely `style`:

- formatting only
- no semantic change
- whitespace only
- lint-only cleanup

## Chore Indicators

Likely `chore`:

- .gitignore
- editor config
- non-functional maintenance
- repo metadata
