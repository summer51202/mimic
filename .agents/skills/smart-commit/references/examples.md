# Examples

## Example 1

Input summary:

- add benchmark csv logger
- update logger header
- fix device buffer cleanup crash
- update logger tests
- adjust README benchmark usage

Output:

git add benchmark/csv_logger.cpp benchmark/csv_logger.h
git commit -m "feat: add csv logger for benchmark output"

git add core/device_buffer.cpp
git commit -m "fix: release device buffer correctly"

git add test/csv_logger_test.cpp
git commit -m "test: update csv logger test coverage"

git add README.md docs/benchmark.md
git commit -m "docs: update benchmark usage instructions"

---

## Example 2

Input summary:

- refactor tensor shape parsing
- add input validation for empty tensor
- improve batching performance
- format touched files

Output:

git add src/tensor_shape.cpp src/tensor_shape.h
git commit -m "refactor: simplify tensor shape parsing"

git add src/tensor_input.cpp
git commit -m "fix: validate empty tensor input"

git add src/batch_runner.cpp
git commit -m "perf: improve batching efficiency"

git add src/tensor_shape.cpp src/tensor_input.cpp src/batch_runner.cpp
git commit -m "style: format updated source files"

---

## Example 3

Input summary:

- update CMake to add benchmark target
- update GitHub Actions to build benchmark
- add benchmark command docs

Output:

git add CMakeLists.txt app/benchmark/CMakeLists.txt
git commit -m "build: add benchmark build target"

git add .github/workflows/ci.yml
git commit -m "ci: build benchmark target in pipeline"

git add README.md docs/benchmark.md
git commit -m "docs: document benchmark commands"

---

## Example 4

Input summary:

- extract cache helper
- add runtime cache support
- add cache tests

Output:

git add src/cache_helper.cpp src/cache_helper.h
git commit -m "refactor: extract cache helper logic"

git add src/runtime_cache.cpp src/runtime_cache.h
git commit -m "feat: add runtime cache support"

git add test/runtime_cache_test.cpp
git commit -m "test: add runtime cache tests"
