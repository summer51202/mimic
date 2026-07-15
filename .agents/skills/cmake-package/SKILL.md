---
name: cmake-package
description: Package this project using CPack in Debug configuration. Use when the user asks to package, create a package, run cpack, or produce a distributable archive.
---

# CMake Package

Produces a distributable `.tar.gz` archive from the current Debug build.

## Prerequisites

The project must be built before packaging. If the `build/` directory is missing or stale, run the `cmake-build-debug` skill first.

## Package

Run from the **project root**:

```powershell
cmake --build build --config Debug --target package
```

## Output

CPack produces a versioned archive in `build/`, named after the CMake `project()` name (`<project>` below = that name):

```
build/<project>-<version>-<platform>.tar.gz
```

Example (for a project named `aasano_ie`):

```
build/aasano_ie-0.1.0-Linux.tar.gz
```

The archive contains:
- `lib/` — shared library (`lib<project>d.so` for Debug; the `d` suffix marks Debug)
- `lib/cmake/<project>/` — CMake config files for downstream consumers
- `include/<project>/` — public headers

## Verify archive contents

```bash
tar -tf build/<project>-*.tar.gz
```

## Notes

- Version is derived from `CI_COMMIT_TAG` env var; defaults to `0.0.0` if not set.
- The trailing `d` in the Debug library name (`lib<project>d.so`) indicates Debug configuration.
- To package Release, first build in Release configuration and replace `-C Debug` with `-C Release`.
