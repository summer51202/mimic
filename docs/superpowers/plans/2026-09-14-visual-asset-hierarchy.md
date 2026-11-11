# Visual Asset Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize Mimic's checked-in visual assets into source, marketing, runtime, platform, documentation, and legacy layers without changing the visuals rendered by existing screens.

**Architecture:** Keep browser-delivered files under `web/public/`, move masters and source sheets into `docs/design/assets/sources/`, and expose all non-marketing runtime art through one typed registry. Physical character state files use stable state names, while screen-specific meanings remain semantic aliases in TypeScript. Tests enforce path existence, source/runtime boundaries, byte preservation, and the immutable root-icon checksum.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Node.js asset scripts, PNGJS, Serwist, Markdown documentation

---

## File structure

The completed change uses these responsibilities:

- `docs/design/assets/sources/mimiku/`: immutable Mimiku master, model sheet, and state sprite sheet.
- `docs/design/assets/sources/pixel-ui/`: source UI sheet used by the deterministic exporter.
- `docs/design/assets/legacy/v0.2-prototype/`: historical mobile and Web mockups/wireframes plus an explicit legacy notice.
- `docs/design/visual-assets.md`: living catalogue, provenance rules, palette authority, rendering tiers, and state usage matrix.
- `web/public/brand/mimiku-hero.png`: the only marketing illustration in the public brand directory.
- `web/public/pixel-ui/characters/`: one canonical binary for each Mimiku runtime state.
- `web/public/pixel-ui/avatars/`: the four current runtime avatars.
- `web/public/pixel-ui/scenes/`: approved but deferred treasury scene exports.
- `web/public/pixel-ui/frames/`: the approved but deferred frame export.
- `web/public/icons/`: unchanged install and maskable icons.
- `web/src/shared/brand/pixel-ui-assets.ts`: typed physical-file registry and semantic role aliases.
- `web/src/shared/brand/assets-boundary.test.ts`: repository boundary and duplicate-content assertions.
- `web/src/shared/brand/pixel-ui-assets.test.ts`: registry, dimensions, transparency, and deterministic-export assertions.
- `web/scripts/export-pixel-runtime-assets.mjs`: exports avatars and the frame from the non-public source sheet.
- `web/scripts/clean-mimiku-alpha.mjs`: cleans only the canonical runtime character files.

## Task 1: Establish the canonical runtime character registry

**Files:**
- Modify: `web/src/shared/brand/pixel-ui-assets.test.ts`
- Modify: `web/src/shared/brand/pixel-ui-assets.ts`
- Modify: `web/src/features/auth/auth-form.tsx`
- Modify: `web/src/app/(public)/features/page.tsx`
- Modify: `web/src/app/offline/page.tsx`
- Modify: `web/src/features/invitations/invite-create-panel.tsx`
- Modify: `web/src/features/invitations/invite-accept-panel.tsx`
- Modify: `web/src/shared/ui/app-route-state.tsx`
- Modify: `web/src/features/groups/member-roster.tsx`
- Move: `web/public/brand/mimiku-{idle,happy,thinking,reminder,serious,lost}.png`
- Move: `web/public/pixel-ui/avatar-{01,02,03,04}.png`
- Move: `web/public/pixel-ui/treasury-{mobile,desktop}.png`
- Move: `web/public/pixel-ui/frames-ui.png`
- Delete: `web/public/pixel-ui/mimiku-{dashboard,empty-group,empty-fund,invite,success,serious}.png`

- [ ] **Step 1: Replace the registry path test with target physical files and semantic roles**

In `web/src/shared/brand/pixel-ui-assets.test.ts`, replace the first registry test with:

```ts
it("exposes canonical physical files and semantic role aliases", () => {
  expect(pixelUiFiles.characters).toEqual({
    idle: "/pixel-ui/characters/mimiku-idle.png",
    happy: "/pixel-ui/characters/mimiku-happy.png",
    thinking: "/pixel-ui/characters/mimiku-thinking.png",
    reminder: "/pixel-ui/characters/mimiku-reminder.png",
    serious: "/pixel-ui/characters/mimiku-serious.png",
    lost: "/pixel-ui/characters/mimiku-lost.png",
  });
  expect(pixelUiRoles).toEqual({
    dashboard: pixelUiFiles.characters.idle,
    emptyGroup: pixelUiFiles.characters.thinking,
    emptyFund: pixelUiFiles.characters.lost,
    invitation: pixelUiFiles.characters.reminder,
    success: pixelUiFiles.characters.happy,
    blockingError: pixelUiFiles.characters.serious,
  });
  expect(pixelUiFiles.avatars).toEqual([
    "/pixel-ui/avatars/avatar-01.png",
    "/pixel-ui/avatars/avatar-02.png",
    "/pixel-ui/avatars/avatar-03.png",
    "/pixel-ui/avatars/avatar-04.png",
  ]);
});
```

Change the import in the same file to:

```ts
import { pixelUiFiles, pixelUiRoles } from "./pixel-ui-assets";
```

- [ ] **Step 2: Run the focused test and confirm the new API is missing**

Run from `web/`:

```powershell
npm test -- src/shared/brand/pixel-ui-assets.test.ts
```

Expected: FAIL because `pixelUiFiles` and `pixelUiRoles` are not exported.

- [ ] **Step 3: Create the runtime directories and move canonical binaries without transforming them**

Run from the repository root:

```powershell
New-Item -ItemType Directory -Force web/public/pixel-ui/characters
New-Item -ItemType Directory -Force web/public/pixel-ui/avatars
New-Item -ItemType Directory -Force web/public/pixel-ui/scenes
New-Item -ItemType Directory -Force web/public/pixel-ui/frames
git mv web/public/brand/mimiku-idle.png web/public/pixel-ui/characters/mimiku-idle.png
git mv web/public/brand/mimiku-happy.png web/public/pixel-ui/characters/mimiku-happy.png
git mv web/public/brand/mimiku-thinking.png web/public/pixel-ui/characters/mimiku-thinking.png
git mv web/public/brand/mimiku-reminder.png web/public/pixel-ui/characters/mimiku-reminder.png
git mv web/public/brand/mimiku-serious.png web/public/pixel-ui/characters/mimiku-serious.png
git mv web/public/brand/mimiku-lost.png web/public/pixel-ui/characters/mimiku-lost.png
git mv web/public/pixel-ui/avatar-01.png web/public/pixel-ui/avatars/avatar-01.png
git mv web/public/pixel-ui/avatar-02.png web/public/pixel-ui/avatars/avatar-02.png
git mv web/public/pixel-ui/avatar-03.png web/public/pixel-ui/avatars/avatar-03.png
git mv web/public/pixel-ui/avatar-04.png web/public/pixel-ui/avatars/avatar-04.png
git mv web/public/pixel-ui/treasury-mobile.png web/public/pixel-ui/scenes/treasury-mobile.png
git mv web/public/pixel-ui/treasury-desktop.png web/public/pixel-ui/scenes/treasury-desktop.png
git mv web/public/pixel-ui/frames-ui.png web/public/pixel-ui/frames/frames-ui.png
```

Expected: Git records moves; PNG contents remain unchanged.

- [ ] **Step 4: Remove only the six byte-identical role-named copies**

Run from the repository root after confirming the canonical state files exist:

```powershell
git rm web/public/pixel-ui/mimiku-dashboard.png
git rm web/public/pixel-ui/mimiku-empty-group.png
git rm web/public/pixel-ui/mimiku-empty-fund.png
git rm web/public/pixel-ui/mimiku-invite.png
git rm web/public/pixel-ui/mimiku-success.png
git rm web/public/pixel-ui/mimiku-serious.png
```

Expected: only the role-named duplicates are removed.

- [ ] **Step 5: Replace the asset module with physical files and semantic aliases**

Replace `web/src/shared/brand/pixel-ui-assets.ts` with:

```ts
export const pixelUiFiles = {
  characters: {
    idle: "/pixel-ui/characters/mimiku-idle.png",
    happy: "/pixel-ui/characters/mimiku-happy.png",
    thinking: "/pixel-ui/characters/mimiku-thinking.png",
    reminder: "/pixel-ui/characters/mimiku-reminder.png",
    serious: "/pixel-ui/characters/mimiku-serious.png",
    lost: "/pixel-ui/characters/mimiku-lost.png",
  },
  avatars: [
    "/pixel-ui/avatars/avatar-01.png",
    "/pixel-ui/avatars/avatar-02.png",
    "/pixel-ui/avatars/avatar-03.png",
    "/pixel-ui/avatars/avatar-04.png",
  ],
  deferred: {
    scenes: {
      treasuryMobile: "/pixel-ui/scenes/treasury-mobile.png",
      treasuryDesktop: "/pixel-ui/scenes/treasury-desktop.png",
    },
    frame: "/pixel-ui/frames/frames-ui.png",
  },
} as const;

export const pixelUiRoles = {
  dashboard: pixelUiFiles.characters.idle,
  emptyGroup: pixelUiFiles.characters.thinking,
  emptyFund: pixelUiFiles.characters.lost,
  invitation: pixelUiFiles.characters.reminder,
  success: pixelUiFiles.characters.happy,
  blockingError: pixelUiFiles.characters.serious,
} as const;
```

The `deferred` key prevents approved candidate assets from being confused with
first-screen assets while preserving them for later per-screen review.

- [ ] **Step 6: Route every current runtime consumer through the registry**

Add the applicable import to each consumer:

```ts
import { pixelUiFiles, pixelUiRoles } from "@/shared/brand/pixel-ui-assets";
```

Use these exact `src` expressions:

```tsx
// web/src/features/auth/auth-form.tsx
src={hasAuthError ? pixelUiRoles.blockingError : pixelUiFiles.characters.idle}

// web/src/app/(public)/features/page.tsx
src={pixelUiFiles.characters.thinking}

// web/src/app/offline/page.tsx
src={pixelUiFiles.characters.idle}

// web/src/features/invitations/invite-create-panel.tsx
src={pixelUiRoles.invitation}

// web/src/features/invitations/invite-accept-panel.tsx
src={error ? pixelUiRoles.blockingError : pixelUiRoles.invitation}

// web/src/shared/ui/app-route-state.tsx
src={pixelUiRoles.blockingError}

// web/src/features/groups/member-roster.tsx
src={pixelUiFiles.avatars[index % pixelUiFiles.avatars.length]}
```

Remove the old `pixelUiAssets` imports. Preserve the existing `Image` dimensions,
`alt`, `priority`, and `unoptimized` props.

- [ ] **Step 7: Adapt the remaining pixel asset assertions to the new registry**

In `web/src/shared/brand/pixel-ui-assets.test.ts`:

```ts
const expectedDimensions = new Map<string, readonly [number, number]>([
  ["mimiku-idle.png", [512, 512]],
  ["mimiku-happy.png", [512, 512]],
  ["mimiku-thinking.png", [512, 512]],
  ["mimiku-reminder.png", [512, 512]],
  ["mimiku-serious.png", [512, 512]],
  ["mimiku-lost.png", [512, 512]],
  ["treasury-mobile.png", [512, 1024]],
  ["treasury-desktop.png", [1024, 620]],
  ["avatar-01.png", [96, 96]],
  ["avatar-02.png", [96, 96]],
  ["avatar-03.png", [96, 96]],
  ["avatar-04.png", [96, 96]],
  ["frames-ui.png", [256, 166]],
]);

const expectedCharacterHashes = new Map([
  ["mimiku-idle.png", "1cc0e72cd73f12f8dbe75a00c2253aec08fd8a27e9ab92430be41ec958eeaea2"],
  ["mimiku-happy.png", "397431082776b3ec037c90b8bfd5a7c144a0dbc730f6b753c782b3836b6727f3"],
  ["mimiku-thinking.png", "d9d60a813500188f95e0391192c34e3943d1dfda2983eb8228baaebb37907b3b"],
  ["mimiku-reminder.png", "2fa3d8b6d27a08b4f98ddfd6f30786c9f0a4fd9757a5ad244c2c56f35484aaec"],
  ["mimiku-serious.png", "2c89947f952dd76aa55c5ddf1f79dc4a501c530458b10355a5214ff6c8d1a442"],
  ["mimiku-lost.png", "4d107876216acac17aa14c80e545e29700373ed5f6c9ac8ae52023991f4e5284"],
]);

function* allRuntimePixelUiPaths(): Generator<string> {
  yield* Object.values(pixelUiFiles.characters);
  yield* pixelUiFiles.avatars;
  yield* Object.values(pixelUiFiles.deferred.scenes);
  yield pixelUiFiles.deferred.frame;
}
```

Add a byte-preservation assertion for the canonical characters:

```ts
it.each(Object.values(pixelUiFiles.characters))(
  "preserves the approved bytes for %s",
  async (publicPath) => {
    const image = await readFile(publicFile(publicPath));
    expect(sha256(image)).toBe(expectedCharacterHashes.get(path.basename(publicPath)));
  },
);
```

Update the parameterized tests to use `allRuntimePixelUiPaths()`,
`pixelUiFiles.avatars`, `Object.values(pixelUiFiles.characters)`, and
`pixelUiFiles.deferred.frame` respectively.

Remove the obsolete `pixelUiAssetPolicy` test. In
`web/src/shared/brand/assets.test.ts`, import the registry and replace the public
brand and transparent-character lists with:

```ts
import { pixelUiFiles } from "./pixel-ui-assets";

const assets = [
  ["mimiku-master.png", 1024, 1024],
  ["mimiku-hero.png", 1672, 941],
  ["mimiku-states.png", 3072, 512],
  ["mimiku-model-sheet.png", 1536, 1024],
] as const;

const transparentCharacterAssets = Object.values(pixelUiFiles.characters);
```

Change the transparent-character inspection path to:

```ts
it.each(transparentCharacterAssets)(
  "ships %s with a transparent exterior and no connected neutral matte",
  async (publicPath) => {
    const inspection = await inspectPng(
      path.join(process.cwd(), "public", publicPath),
    );

    expect(inspection).toMatchObject({
      exteriorCornerTransparent: true,
      connectedNeutralPixels: 0,
      hasTransparentPixel: true,
    });
  },
);
```

- [ ] **Step 8: Run registry and component tests**

Run from `web/`:

```powershell
npm test -- src/shared/brand/pixel-ui-assets.test.ts src/shared/brand/assets.test.ts src/features/auth/auth-form.test.tsx src/features/invitations/invitation-flow.test.tsx src/features/groups/group-actions.test.tsx src/shared/ui/app-route-state.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit the canonical runtime hierarchy**

```powershell
git add web/public/brand web/public/pixel-ui web/src/shared/brand web/src/features/auth/auth-form.tsx "web/src/app/(public)/features/page.tsx" web/src/app/offline/page.tsx web/src/features/invitations web/src/shared/ui/app-route-state.tsx web/src/features/groups/member-roster.tsx
git commit -m "refactor(web): establish canonical runtime art"
```

## Task 2: Move source-only art out of the public tree

**Files:**
- Move: `web/public/brand/mimiku-master.png`
- Move: `web/public/brand/mimiku-model-sheet.png`
- Move: `web/public/brand/mimiku-states.png`
- Move: `web/public/pixel-ui/icons-ui.png`
- Modify: `web/scripts/export-pixel-runtime-assets.mjs`
- Modify: `web/scripts/clean-mimiku-alpha.mjs`
- Modify: `web/src/shared/brand/assets.test.ts`
- Modify: `web/src/shared/brand/pixel-ui-assets.test.ts`

- [ ] **Step 1: Add assertions for the non-public source locations**

Add `createHash` to the imports in `web/src/shared/brand/assets.test.ts`:

```ts
import { createHash } from "node:crypto";
```

Then add this test:

```ts
it.each([
  ["mimiku/mimiku-master.png", 1024, 1024, "f69a20b714799566fbe21734419e7480655c37f6417cbd224c1e240b448c40ac"],
  ["mimiku/mimiku-model-sheet.png", 1536, 1024, "ce5a64f0109db010c87d3a4e3c0c5b90d4d818589394094541d145d38a383120"],
  ["mimiku/mimiku-states.png", 3072, 512, "3daaf12b2ec91f5e7bebdd515c3da0b0e462d2c6c956233f5c22910d8add54a2"],
  ["pixel-ui/icons-ui.png", 1536, 1024, "c8a4cd0a1523a9daab32d778f1c8226a3199dda0b20bd5f16d8f6e795e224bb4"],
] as const)("keeps source asset %s outside public", async (file, width, height, sha256) => {
  const image = await readFile(
    path.join(process.cwd(), "..", "docs", "design", "assets", "sources", file),
  );

  expect(image.subarray(0, 8).toString("hex")).toBe(pngSignature);
  expect(image.readUInt32BE(16)).toBe(width);
  expect(image.readUInt32BE(20)).toBe(height);
  expect(createHash("sha256").update(image).digest("hex")).toBe(sha256);
});
```

Reduce the existing public brand asset list to:

```ts
const assets = [["mimiku-hero.png", 1672, 941]] as const;
```

- [ ] **Step 2: Run the focused asset tests and confirm source paths are missing**

Run from `web/`:

```powershell
npm test -- src/shared/brand/assets.test.ts
```

Expected: FAIL with `ENOENT` under `docs/design/assets/sources/`.

- [ ] **Step 3: Move source files without changing their bytes**

Run from the repository root:

```powershell
New-Item -ItemType Directory -Force docs/design/assets/sources/mimiku
New-Item -ItemType Directory -Force docs/design/assets/sources/pixel-ui
git mv web/public/brand/mimiku-master.png docs/design/assets/sources/mimiku/mimiku-master.png
git mv web/public/brand/mimiku-model-sheet.png docs/design/assets/sources/mimiku/mimiku-model-sheet.png
git mv web/public/brand/mimiku-states.png docs/design/assets/sources/mimiku/mimiku-states.png
git mv web/public/pixel-ui/icons-ui.png docs/design/assets/sources/pixel-ui/icons-ui.png
```

Expected: Git recognizes the four PNG moves and their hashes do not change.

- [ ] **Step 4: Point the deterministic exporter at the source layer and nested runtime outputs**

In `web/scripts/export-pixel-runtime-assets.mjs`, import `mkdir` and replace the
directory constants and pending-write setup with:

```js
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const webDirectory = path.resolve(scriptDirectory, "..");
const repositoryDirectory = path.resolve(webDirectory, "..");
const runtimeDirectory = path.join(webDirectory, "public", "pixel-ui");
const sourcePath = path.join(
  repositoryDirectory,
  "docs",
  "design",
  "assets",
  "sources",
  "pixel-ui",
  "icons-ui.png",
);
```

Use this export-directory logic inside `exportRuntimeAssets`:

```js
export async function exportRuntimeAssets(outputDirectory) {
  const source = PNG.sync.read(await readFile(sourcePath));
  const avatarDirectory = outputDirectory ?? path.join(runtimeDirectory, "avatars");
  const frameDirectory = outputDirectory ?? path.join(runtimeDirectory, "frames");
  await mkdir(avatarDirectory, { recursive: true });
  await mkdir(frameDirectory, { recursive: true });
  const pendingWrites = [];

  for (const [filename, x, y, width, height] of avatarExports) {
    const avatarCrop = crop(source, x, y, width, height);
    clearConnectedNeutralBackground(avatarCrop);
    const bounds = nonTransparentBounds(avatarCrop);
    const contained = resizeContainNearest(avatarCrop, bounds, 88, 88);
    pendingWrites.push([
      path.join(avatarDirectory, filename),
      centerWithoutResampling(contained, 96, 96),
    ]);
  }

  const [frameFilename, frameX, frameY, frameWidth, frameHeight] = frameExport;
  const frameCrop = crop(source, frameX, frameY, frameWidth, frameHeight);
  clearConnectedNeutralBackground(frameCrop);
  nonTransparentBounds(frameCrop);
  pendingWrites.push([
    path.join(frameDirectory, frameFilename),
    centerWithoutResampling(frameCrop, 256, 166),
  ]);

  for (const [filename, png] of pendingWrites) {
    await writePngAtomic(filename, png);
  }
}
```

Change `outputDirectoryFromArguments` so the no-argument case returns
`undefined`:

```js
function outputDirectoryFromArguments(arguments_) {
  if (arguments_.length === 0) return undefined;
  if (arguments_.length === 2 && arguments_[0] === "--output-dir") {
    return path.resolve(arguments_[1]);
  }
  throw new Error("Usage: npm run assets:export -- [--output-dir <directory>]");
}
```

- [ ] **Step 5: Make the alpha cleaner operate on only six canonical states**

In `web/scripts/clean-mimiku-alpha.mjs`, replace `publicDirectory` and
`characterFiles` with:

```js
const characterDirectory = path.resolve(
  scriptDirectory,
  "..",
  "public",
  "pixel-ui",
  "characters",
);

const characterFiles = [
  "mimiku-idle.png",
  "mimiku-happy.png",
  "mimiku-thinking.png",
  "mimiku-reminder.png",
  "mimiku-serious.png",
  "mimiku-lost.png",
];
```

Change the loop path to:

```js
const filename = path.join(characterDirectory, relativePath);
```

- [ ] **Step 6: Update deterministic-export paths in the test**

In `web/src/shared/brand/pixel-ui-assets.test.ts`, construct committed files as:

```ts
const committedFiles = new Map([
  ...pixelUiFiles.avatars.map((publicPath) => [
    path.basename(publicPath),
    path.join(process.cwd(), "public", publicPath),
  ] as const),
  [
    path.basename(pixelUiFiles.deferred.frame),
    path.join(process.cwd(), "public", pixelUiFiles.deferred.frame),
  ] as const,
]);

const filenames = [...committedFiles.keys()];
const committedHashes = new Map(
  await Promise.all(
    [...committedFiles].map(async ([filename, filenamePath]) => [
      filename,
      sha256(await readFile(filenamePath)),
    ] as const),
  ),
);
```

Keep the temporary output-directory assertions unchanged; explicit
`--output-dir` exports remain flat for reproducibility tests.

- [ ] **Step 7: Run the source, exporter, and alpha tests**

Run from `web/`:

```powershell
npm test -- src/shared/brand/assets.test.ts src/shared/brand/pixel-ui-assets.test.ts
npm run assets:export
npm test -- src/shared/brand/pixel-ui-assets.test.ts
```

Expected: all tests PASS, and `git status --short` shows no regenerated PNG
differences because the exporter remains deterministic.

- [ ] **Step 8: Commit the source/runtime boundary**

```powershell
git add docs/design/assets/sources web/public web/scripts web/src/shared/brand
git commit -m "refactor(web): separate visual sources from runtime"
```

## Task 3: Enforce the public asset boundary

**Files:**
- Create: `web/src/shared/brand/assets-boundary.test.ts`
- Modify: `web/src/shared/brand/assets.test.ts`
- Modify: `web/src/app/sw.ts`
- Modify: `web/src/app/pwa-cache-policy.test.ts`
- Delete: `web/public/file.svg`
- Delete: `web/public/globe.svg`
- Delete: `web/public/next.svg`
- Delete: `web/public/vercel.svg`
- Delete: `web/public/window.svg`

- [ ] **Step 1: Add a failing public-boundary test**

Create `web/src/shared/brand/assets-boundary.test.ts`:

```ts
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const publicDirectory = path.join(process.cwd(), "public");
const forbiddenPublicNames = new Set([
  "mimiku-master.png",
  "mimiku-model-sheet.png",
  "mimiku-states.png",
  "icons-ui.png",
  "file.svg",
  "globe.svg",
  "next.svg",
  "vercel.svg",
  "window.svg",
  "mimiku-dashboard.png",
  "mimiku-empty-group.png",
  "mimiku-empty-fund.png",
  "mimiku-invite.png",
  "mimiku-success.png",
]);

describe("visual asset boundaries", () => {
  it("keeps masters, source sheets, and starter art out of public", async () => {
    const names = (await filesBelow(publicDirectory)).map((file) => path.basename(file));
    expect(names.filter((name) => forbiddenPublicNames.has(name))).toEqual([]);
  });

  it("contains no byte-identical Mimiku runtime files", async () => {
    const files = (await filesBelow(path.join(publicDirectory, "pixel-ui", "characters")))
      .filter((file) => file.endsWith(".png"));
    const hashes = await Promise.all(
      files.map(async (file) => createHash("sha256").update(await readFile(file)).digest("hex")),
    );
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it("removes screen-role copies from the old flat pixel-ui paths", async () => {
    const oldRolePaths = [
      "mimiku-dashboard.png",
      "mimiku-empty-group.png",
      "mimiku-empty-fund.png",
      "mimiku-invite.png",
      "mimiku-success.png",
      "mimiku-serious.png",
    ];
    const flatNames = await readdir(path.join(publicDirectory, "pixel-ui"));
    expect(flatNames.filter((name) => oldRolePaths.includes(name))).toEqual([]);
  });
});

async function filesBelow(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(entryPath) : [entryPath];
  }));
  return nested.flat();
}
```

- [ ] **Step 2: Run the boundary test and confirm starter SVG failures**

Run from `web/`:

```powershell
npm test -- src/shared/brand/assets-boundary.test.ts
```

Expected: FAIL listing the five unused starter SVG filenames.

- [ ] **Step 3: Remove only the unused Next.js starter SVGs**

Run from the repository root:

```powershell
git rm web/public/file.svg
git rm web/public/globe.svg
git rm web/public/next.svg
git rm web/public/vercel.svg
git rm web/public/window.svg
```

Expected: the five SVGs are staged for deletion; PWA icons and Mimiku art remain.

- [ ] **Step 4: Update the service-worker character cache matcher**

In `web/src/app/sw.ts`, replace the public brand matcher with:

```ts
{
  matcher: ({ sameOrigin, url }) =>
    sameOrigin &&
    /^\/pixel-ui\/characters\/mimiku-(?:happy|idle)\.png$/.test(url.pathname),
  handler: new CacheFirst({
    cacheName: "mimic-runtime-characters",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 4,
        maxAgeSeconds: 30 * 24 * 60 * 60,
        maxAgeFrom: "last-used",
      }),
    ],
  }),
},
```

Add this assertion to `web/src/app/pwa-cache-policy.test.ts`:

```ts
it("caches only the canonical public character paths", () => {
  const serviceWorker = readProjectFile("src/app/sw.ts");

  expect(serviceWorker).toContain(
    "^\\/pixel-ui\\/characters\\/mimiku-(?:happy|idle)\\.png$",
  );
  expect(serviceWorker).not.toContain("/brand/mimiku-");
});
```

- [ ] **Step 5: Run boundary and cache tests**

Run from `web/`:

```powershell
npm test -- src/shared/brand/assets-boundary.test.ts src/app/pwa-cache-policy.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit public-tree hygiene**

```powershell
git add web/public web/src/shared/brand/assets-boundary.test.ts web/src/app/sw.ts web/src/app/pwa-cache-policy.test.ts
git commit -m "chore(web): enforce public asset boundary"
```

## Task 4: Publish the living visual asset catalogue

**Files:**
- Create: `docs/design/visual-assets.md`
- Delete: `web/public/brand/README.md`
- Delete: `web/public/pixel-ui/README.md`
- Modify: `web/src/styles/tokens.css`

- [ ] **Step 1: Create the catalogue with the canonical hierarchy and usage matrix**

Create `docs/design/visual-assets.md` with these required sections and content:

```markdown
# Mimic visual assets

## Authority

- Runtime palette: `web/src/styles/tokens.css`
- Immutable master: repository-root `icon.png`
- Runtime registry: `web/src/shared/brand/pixel-ui-assets.ts`
- Source assets: `docs/design/assets/sources/`
- Browser-delivered assets: `web/public/brand/`, `web/public/pixel-ui/`, and `web/public/icons/`

The root `icon.png` is never moved, overwritten, recompressed, or regenerated.
Operational labels, amounts, dates, errors, and statuses remain live HTML.

## Rendering tiers

### Marketing illustration

Marketing art may use richer lighting and texture. It must preserve Mimiku's
treasure-chest anatomy, offset eyes, dark outline, wood panels, gold hardware,
cream teeth, and heart coin. Add an asset only when a named public-page consumer
exists.

### Runtime pixel UI

Runtime art uses transparent backgrounds where appropriate, integer CSS display
sizes, `image-rendering: pixelated`, stable silhouettes, and compact delivery
formats. Screen meanings are semantic registry roles rather than copied files.

## State usage matrix

| Role | File state | Consumer | CSS/display intent | Loading | Accessibility | Status |
|---|---|---|---|---|---|---|
| Public hero | hero | `Hero` | responsive section art | priority | descriptive alt | active |
| Authentication idle | idle | `AuthForm` | 160-240px | eager with form | descriptive alt | active |
| Authentication error | serious | `AuthForm` | 160-240px | state swap | descriptive alt | active |
| Offline | idle | offline page | 128px | priority/offline cache | descriptive alt | active |
| Feature explanation | thinking | features page | 144-192px | normal | descriptive alt | active |
| Invitation | reminder | invite panels | up to 192px | panel-local | descriptive alt | active |
| Blocking route state | serious | `AppRouteState` | 112-160px | state-local | descriptive alt | active |
| Member avatar | avatar-01..04 | `MemberRoster` | 48px | list-local | member-specific alt | active |
| Dashboard companion | idle | none | 96-160px | never preload | descriptive alt when added | available |
| Empty group | thinking | none | 96-160px | never preload | descriptive alt when added | available |
| Empty fund | lost | none | 96-160px | never preload | descriptive alt when added | available |
| Success | happy | none | 96-160px | never preload | descriptive alt when added | available |
| Treasury scenes | mobile/desktop | none | pending decomposition | never preload | pending screen review | deferred |
| Pixel frame | frames-ui | none | pending 9-slice review | never preload | decorative | deferred |
| UI icons | source sheet only | none | 24/32/48px after export | component-local | visible label or aria-label | deferred |

## Provenance and naming

Every added visual records its source, generation or export method, dimensions,
intended CSS size, consumer, loading policy, and accessibility role. Physical
character files use emotion/state names; page-specific names belong in the
TypeScript role registry.

## Deferred optimization

Per-screen review decides palette quantization, responsive derivatives, scene
decomposition, individual icon exports, new state art, animation, and visual
effects. Structural organization never silently changes image bytes.
```

- [ ] **Step 2: Make palette authority explicit in the token file**

Add this comment above `:root` in `web/src/styles/tokens.css`:

```css
/* Canonical runtime palette for UI code and newly exported runtime artwork. */
```

Do not alter any token value in this phase.

- [ ] **Step 3: Remove public README files after their durable content is represented in the catalogue and source history**

Run from the repository root:

```powershell
git rm web/public/brand/README.md
git rm web/public/pixel-ui/README.md
```

Expected: runtime public directories contain browser assets only.

- [ ] **Step 4: Verify the catalogue names every public asset class**

Run from the repository root:

```powershell
rg -n "Marketing illustration|Runtime pixel UI|State usage matrix|Provenance|Deferred optimization" docs/design/visual-assets.md
rg -n "Canonical runtime palette" web/src/styles/tokens.css
```

Expected: each catalogue heading and the token authority comment appears once.

- [ ] **Step 5: Commit the visual asset catalogue**

```powershell
git add docs/design/visual-assets.md web/public/brand/README.md web/public/pixel-ui/README.md web/src/styles/tokens.css
git commit -m "docs: publish visual asset catalogue"
```

## Task 5: Archive superseded PairFund design artifacts

**Files:**
- Create: `docs/design/assets/legacy/v0.2-prototype/README.md`
- Move: `docs/design/assets/mobile-mockups/`
- Move: `docs/design/assets/mobile-wireframes/`
- Move: `docs/design/assets/web-mockups/`
- Move: `docs/design/assets/web-wireframes/`
- Modify: `docs/design/pairfund-mobile-ui-v0.2.md`
- Modify: `docs/design/pairfund-mobile-ui-round2-v0.2.md`
- Modify: `docs/design/mimic-web-ui-v0.2.md`

- [ ] **Step 1: Add a failing legacy-location link check**

Before moving files, run from the repository root:

```powershell
rg -n "assets/(mobile-mockups|mobile-wireframes|web-mockups|web-wireframes)" docs/design
```

Expected: matches remain in the three historical design documents, demonstrating
that links still point to unclassified legacy directories.

- [ ] **Step 2: Move the four historical directories into the legacy layer**

Run from the repository root:

```powershell
New-Item -ItemType Directory -Force docs/design/assets/legacy/v0.2-prototype
git mv docs/design/assets/mobile-mockups docs/design/assets/legacy/v0.2-prototype/mobile-mockups
git mv docs/design/assets/mobile-wireframes docs/design/assets/legacy/v0.2-prototype/mobile-wireframes
git mv docs/design/assets/web-mockups docs/design/assets/legacy/v0.2-prototype/web-mockups
git mv docs/design/assets/web-wireframes docs/design/assets/legacy/v0.2-prototype/web-wireframes
```

Expected: all 26 SVGs remain tracked under the legacy path.

- [ ] **Step 3: Add an explicit legacy notice**

Create `docs/design/assets/legacy/v0.2-prototype/README.md`:

```markdown
# PairFund v0.2 legacy design assets

These wireframes and mockups predate the Mimic pixel-fantasy visual system and
remain only as historical product-design records. They use the former PairFund
name, palette, typography, and rounded-card direction.

Do not use these files as visual authority for new Mimic screens. Current visual
asset rules live in `docs/design/visual-assets.md`; current product behavior lives
in the financial-spaces specifications under `docs/superpowers/specs/`.
```

- [ ] **Step 4: Update historical document links atomically**

Run this mechanical path-only rewrite from the repository root:

```powershell
$mobileDocs = @(
  "docs/design/pairfund-mobile-ui-v0.2.md",
  "docs/design/pairfund-mobile-ui-round2-v0.2.md"
)
foreach ($document in $mobileDocs) {
  $content = Get-Content -Raw -LiteralPath $document
  $content = $content.Replace(
    "docs/design/assets/mobile-mockups/",
    "docs/design/assets/legacy/v0.2-prototype/mobile-mockups/"
  )
  $content = $content.Replace(
    "docs/design/assets/mobile-wireframes/",
    "docs/design/assets/legacy/v0.2-prototype/mobile-wireframes/"
  )
  Set-Content -NoNewline -LiteralPath $document -Value $content
}

$webDocument = "docs/design/mimic-web-ui-v0.2.md"
$webContent = Get-Content -Raw -LiteralPath $webDocument
$webContent = $webContent.Replace(
  "assets/web-mockups/",
  "assets/legacy/v0.2-prototype/web-mockups/"
)
$webContent = $webContent.Replace(
  "assets/web-wireframes/",
  "assets/legacy/v0.2-prototype/web-wireframes/"
)
Set-Content -NoNewline -LiteralPath $webDocument -Value $webContent
```

This performs these exact path-prefix replacements:

```text
docs/design/assets/mobile-mockups/
→ docs/design/assets/legacy/v0.2-prototype/mobile-mockups/

docs/design/assets/mobile-wireframes/
→ docs/design/assets/legacy/v0.2-prototype/mobile-wireframes/

assets/web-mockups/
→ assets/legacy/v0.2-prototype/web-mockups/

assets/web-wireframes/
→ assets/legacy/v0.2-prototype/web-wireframes/
```

For the absolute `/d:/Project/mimic/...` links in the two mobile documents, keep
their existing absolute-link style and insert `legacy/v0.2-prototype/` after
`docs/design/assets/`.

- [ ] **Step 5: Verify no old paths remain and all linked SVGs exist**

Run from the repository root:

```powershell
rg -n "assets/(mobile-mockups|mobile-wireframes|web-mockups|web-wireframes)" docs/design
Get-ChildItem -Recurse -File docs/design/assets/legacy/v0.2-prototype -Filter *.svg | Measure-Object
```

Expected: `rg` returns no matches and `Measure-Object` reports `Count : 26`.

- [ ] **Step 6: Commit the legacy classification**

```powershell
git add docs/design
git commit -m "docs: archive PairFund visual artifacts"
```

## Task 6: Complete baseline verification and record the migration

**Files:**
- Modify: `.agents/devlog.md`

- [ ] **Step 1: Run stale-path and public-source scans**

Run from the repository root:

```powershell
rg -n "/brand/mimiku-(idle|happy|thinking|reminder|serious|lost)\.png|/pixel-ui/mimiku-|/pixel-ui/(avatar-|treasury-|frames-ui|icons-ui)" web/src web/scripts
rg -n "mimiku-(master|model-sheet|states)\.png|icons-ui\.png" web/public
```

Expected: both commands return no matches. References to nested canonical paths
and the non-public source sheet are allowed.

- [ ] **Step 2: Verify the root icon checksum and duplicate removal**

Run from the repository root:

```powershell
(Get-FileHash -Algorithm SHA256 icon.png).Hash.ToLowerInvariant()
Get-ChildItem web/public/pixel-ui/characters/*.png | Get-FileHash -Algorithm SHA256 | Select-Object -ExpandProperty Hash | Sort-Object -Unique | Measure-Object
```

Expected: the icon hash is
`f69a20b714799566fbe21734419e7480655c37f6417cbd224c1e240b448c40ac`,
and the character hash count is `6`.

- [ ] **Step 3: Run the complete Web verification sequence**

Run from `web/`:

```powershell
npm run lint
npm run typecheck
npm test
$env:MIMIC_API_BASE_URL = "http://localhost:3000/api/v1"
npm run build
npm run test:e2e -- e2e/pixel-responsive.spec.ts
```

Expected: lint, typecheck, all Vitest suites, and the Next.js production build
complete successfully; the public pixel shell passes at the configured 320px,
390px, 768px, and 1440px Playwright viewports.

- [ ] **Step 4: Append the required devlog entry**

Append this entry to `.agents/devlog.md`:

```markdown
## 2026-09-14 — Establish visual asset hierarchy

**Task:** Separate Mimic visual sources, runtime assets, documentation art, and legacy mockups without changing rendered visuals.  
**Scope:** `web/public`, `web/src/shared/brand`, asset scripts and tests, service-worker asset paths, `docs/design`  
**What changed:**
- Moved master and source sheets out of the browser-delivered public tree.
- Replaced six duplicate role-named Mimiku files with one canonical six-state runtime set and semantic aliases.
- Published the visual asset catalogue and enforced public-tree boundaries in tests.
- Archived superseded PairFund mockups under an explicit legacy path.
**Decisions:** Runtime palette tokens are authoritative; image optimization and screen-level visual changes remain deferred.  
**Known gaps / follow-ups:** Review responsive image variants, scene decomposition, exported UI icons, state coverage, and effects one screen at a time.
```

- [ ] **Step 5: Confirm only intended files are changed**

Run from the repository root:

```powershell
git status --short
git diff --check
```

Expected: `.codex-remote-attachments/` and `reference/` remain untouched and
untracked; no whitespace errors appear.

- [ ] **Step 6: Commit the verification record**

```powershell
git add .agents/devlog.md
git commit -m "docs: record visual asset hierarchy migration"
```

- [ ] **Step 7: Inspect the final branch history and cleanliness**

Run from the repository root:

```powershell
git log -6 --oneline
git status --short
```

Expected: the six implementation commits appear in dependency order, while the
only remaining status entries are the user's pre-existing untracked
`.codex-remote-attachments/` and `reference/` directories.
