---
name: cmake-build-debug
description: Build this project in Debug configuration using CMake with Visual Studio 17 2022 (VS2022), host=x86, target x64. Use when the user asks to build, compile, configure, or rebuild the project in Debug mode, or mentions cmake build / debug build / clean build.
---

# CMake Build Debug

## Prerequisites

- Visual Studio 17 2022 with C++ workload installed
- CMake 3.x available (on PATH or at a known location)

### If cmake is not on PATH

Search in this order, stop at first match:

```powershell
# 1. Check PATH first
where.exe cmake 2>$null

# 2. Common standalone install
if (Test-Path "C:\Program Files\CMake\bin\cmake.exe") { "C:\Program Files\CMake\bin\cmake.exe" }

# 3. VS2022 bundled cmake
& "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe" -latest -products * -requires Microsoft.VisualStudio.Component.VC.CMake.Project -find "Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe" 2>$null

# 4. PowerShell command resolution
(Get-Command cmake -ErrorAction SilentlyContinue).Source
```

If found, use the **full path** for all subsequent cmake commands in this session.
If not found, stop and tell the user: "cmake not found. Add cmake to PATH or install from https://cmake.org/download/"

## Configure & Build

**Step 1 — Configure** (run from project root):

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -T host=x86 -A x64
```

**Step 2 — Build**:

```powershell
cmake --build build --config Debug -j 32
```

## Notes

- Generator: Visual Studio 17 2022
- Host toolset: x86 (`-T host=x86`)
- Target platform: x64 (`-A x64`)
- Configuration: Debug
- Parallel jobs: 32 (matches the 32 logical cores on this dev machine; adjust for your hardware)

## When to re-run configure

Re-run Step 1 only when:
- `CMakeLists.txt` or `cmake/` files change
- The `build/` directory is missing or corrupted
- Switching generator or platform

Otherwise, Step 2 alone is sufficient.

## Clean rebuild

Delete the build directory first, then run both steps:

```powershell
Remove-Item -Recurse -Force build
cmake -S . -B build -G "Visual Studio 17 2022" -T host=x86 -A x64
cmake --build build --config Debug -j 32
```

## Build 失敗排查

| Symptom | Likely Cause | Action |
|---------|-------------|--------|
| `error MSB8020`: Build tools not found | VS2022 toolset missing | Install VS2022 C++ workload; verify `-T host=x86` matches installed toolset |
| `CMake Error`: Generator not found | VS2022 not installed | Run `cmake --help` and confirm "Visual Studio 17 2022" appears in generator list |
| LNK2001/LNK2019 linker errors | Missing library or config mismatch | Check `cmake/` dependency targets; confirm dependency is built in Debug |
| Out of memory during parallel build | `-j 32` too aggressive | Reduce to `-j 8` or `-j 16` and retry |
| `LINK : fatal error LNK1104` | `.lib` or `.pdb` locked | Close Visual Studio IDE if running alongside the build |
