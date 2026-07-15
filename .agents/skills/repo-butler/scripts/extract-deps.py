#!/usr/bin/env python3
"""
extract-deps.py: Compress cmake dependencies into LLM-readable summary.
Usage: python3 extract-deps.py [repo-path]

Output example:
  === DEPS: inference_engine ===
  -- Internal (company repos) --
    appareo        0.3.3   project:434
  -- Mirrors (OSS on GitLab) --
    spdlog         1.15.3  project:570
  -- External (GitHub) --
    json           3.11.3
  -- System (find_package) --
    Torch          any
    OpenVINO       2026.1.0
"""

import sys
import re
from pathlib import Path

INTERNAL_REGISTRY = "172.22.137.46"

KNOWN_OSS = {
    "spdlog", "opencv", "cryptopp", "googletest", "gtest",
    "argparse", "pybind", "json", "magic_enum", "xtl",
    "xtensor", "eigen", "boost", "fmt", "catch2",
}


def find_deps_file(repo: Path) -> Path | None:
    for candidate in [
        repo / "cmake" / "dependencies.cmake",
        repo / "cmake" / "Dependencies.cmake",
        repo / "CMakeLists.txt",
    ]:
        if candidate.exists():
            return candidate
    for f in repo.rglob("dependencies.cmake"):
        return f
    return None


def extract_version(url: str) -> str:
    # Internal registry: .../packages/generic/{pkg}/{version}/...
    m = re.search(r"/packages/generic/[^/]+/([^/]+)/", url)
    if m:
        return m.group(1)
    # GitHub: /tags/v1.2.3 or /download/v1.2.3
    m = re.search(r"(?:tags|download)/v?(\d+(?:\.\d+)*)", url)
    if m:
        return m.group(1)
    m = re.search(r"[/_-]v?(\d+(?:\.\d+)+)[/_.-]", url)
    if m:
        return m.group(1)
    return "?"


def extract_project_id(url: str) -> str:
    m = re.search(r"/projects/(\d+)/", url)
    return m.group(1) if m else "?"


def parse_fetch_content(content: str) -> dict[str, dict]:
    # Collect variable URL definitions (e.g. set(KPP_URL "http://..."))
    var_urls: dict[str, str] = {}
    for m in re.finditer(r'set\s*\(\s*(\w+_URL)\s+"([^"]+)"', content):
        var_urls[m.group(1)] = m.group(2)

    results: dict[str, dict] = {}
    pos = 0

    while True:
        m = re.search(r"FetchContent_Declare\s*\(", content[pos:])
        if not m:
            break

        block_start = pos + m.end()
        depth, j = 1, block_start
        while j < len(content) and depth > 0:
            if content[j] == "(":
                depth += 1
            elif content[j] == ")":
                depth -= 1
            j += 1
        block = content[block_start : j - 1]
        pos = pos + m.start() + 1

        name_m = re.match(r"\s*(\w+)", block)
        if not name_m:
            continue
        name = name_m.group(1).lower()

        if name in results:
            continue

        # Resolve URL (direct string or ${VAR})
        url = ""
        var_ref = re.search(r"\bURL\b\s+\$\{(\w+)\}", block)
        if var_ref:
            url = var_urls.get(var_ref.group(1), "")
        else:
            str_url = re.search(r'\bURL\b\s+"?([^\s\n")]+)"?', block)
            if str_url:
                url = str_url.group(1)

        if not url:
            continue

        version = extract_version(url)

        if INTERNAL_REGISTRY in url:
            proj_id = extract_project_id(url)
            kind = "mirror" if name in KNOWN_OSS else "internal"
            results[name] = {"version": version, "type": kind, "project_id": proj_id}
        elif "github.com" in url:
            results[name] = {"version": version, "type": "external"}
        else:
            results[name] = {"version": version, "type": "external"}

    return results


def parse_system_deps(content: str, fetch_names: set[str]) -> list[dict]:
    seen: set[str] = set()
    results = []

    for m in re.finditer(
        r"find_package\s*\(\s*(\w+)\s*([\d.]*)\s*(REQUIRED|QUIET)?", content
    ):
        name = m.group(1)
        if name.lower() in fetch_names or name in seen:
            continue
        seen.add(name)
        results.append({"name": name, "version": m.group(2) or "any"})

    return results


def main():
    repo = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    repo_name = repo.name

    deps_file = find_deps_file(repo)
    if not deps_file:
        print(f"ERROR: no cmake dependency file found in {repo}")
        sys.exit(1)

    content = deps_file.read_text()

    # For system find_package, also scan CMakeLists.txt if deps are in separate file
    if deps_file.name != "CMakeLists.txt":
        cml = repo / "CMakeLists.txt"
        full_content = content + ("\n" + cml.read_text() if cml.exists() else "")
    else:
        full_content = content

    fetch = parse_fetch_content(content)
    system = parse_system_deps(full_content, set(fetch.keys()))

    internal = {k: v for k, v in fetch.items() if v["type"] == "internal"}
    mirrors  = {k: v for k, v in fetch.items() if v["type"] == "mirror"}
    external = {k: v for k, v in fetch.items() if v["type"] == "external"}

    print(f"=== DEPS: {repo_name} ===")

    if internal:
        print("-- Internal (company repos) --")
        for name, d in internal.items():
            print(f"  {name:<16} {d['version']:<10} project:{d['project_id']}")

    if mirrors:
        print("-- Mirrors (OSS on GitLab) --")
        for name, d in mirrors.items():
            print(f"  {name:<16} {d['version']:<10} project:{d['project_id']}")

    if external:
        print("-- External (GitHub) --")
        for name, d in external.items():
            print(f"  {name:<16} {d['version']}")

    if system:
        print("-- System (find_package) --")
        for d in system:
            print(f"  {d['name']:<16} {d['version']}")

    total = len(fetch) + len(system)
    print(
        f"\n[{total} deps: {len(internal)} internal, {len(mirrors)} mirrors, "
        f"{len(external)} external, {len(system)} system]"
    )


if __name__ == "__main__":
    main()
