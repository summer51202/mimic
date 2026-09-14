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
