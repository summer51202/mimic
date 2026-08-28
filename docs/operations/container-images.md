# Production base image pins

Mimic retains readable Docker image tags but resolves every release stage through an immutable multi-arch manifest-list digest. Pinning the index rather than one architecture-specific child keeps local and Railway builds portable across supported Linux architectures while making the selected release content immutable. The verified indexes include Linux `amd64` and `arm64/v8`; Docker selects the matching child manifest for the builder platform.

Current sources, verified 2026-08-28 against official Docker Hub tag metadata:

- `node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5`
  - `https://hub.docker.com/v2/namespaces/library/repositories/node/tags/22-bookworm-slim`
- `alpine:3.22.2@sha256:4b7ce07002c69e8f3d704a9c5d6fd3053be500b7f1c69fc0d80990c2ad8dd412`
  - `https://hub.docker.com/v2/namespaces/library/repositories/alpine/tags/3.22.2`

## Updating a pin

1. Choose the intended readable release tag; do not silently change both the release line and digest.
2. Read the tag's official Docker Hub metadata endpoint and record its top-level `digest`, `media_type`, and architecture list. Require an OCI image index or Docker manifest list with the deployment architectures represented.
3. On a Docker-capable trusted machine, cross-check with `docker buildx imagetools inspect <image>:<tag>`.
4. Replace the tag and multi-arch `sha256:` digest in every `FROM` stage and update the exact expected value in `scripts/verify-production-images.test.mjs`.
5. Run the production-image contract, build all three images, and execute the CI runtime smoke checks before merging.

Never substitute a per-platform child digest unless the deployment platform is intentionally being restricted and that decision is documented.
