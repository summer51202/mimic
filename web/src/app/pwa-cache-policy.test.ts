import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(path: string) {
  return readFileSync(`${projectRoot}/${path}`, "utf8");
}

describe("PWA cache policy", () => {
  it("does not precache public route documents with a fixed shell revision", () => {
    const nextConfig = readProjectFile("next.config.ts");
    const routeDocuments = ["/", "/features", "/privacy", "/terms", "/offline"];

    for (const routeDocument of routeDocuments) {
      expect(nextConfig).not.toMatch(
        new RegExp(
          String.raw`\{\s*url:\s*"${routeDocument.replace("/", String.raw`\/`)}"\s*,\s*revision:\s*publicShellRevision\s*\}`,
        ),
      );
    }
  });

  it("normalizes public precache asset URLs for browser-safe paths", () => {
    const nextConfig = readProjectFile("next.config.ts");

    expect(nextConfig).toContain('url: entry.url.replace(/\\\\/g, "/")');
  });

  it("precaches install icons with content-derived revisions", () => {
    const nextConfig = readProjectFile("next.config.ts");

    expect(nextConfig).toContain('createHash("sha256")');
    expect(nextConfig).toContain('"/icons/icon-512.png"');
    expect(nextConfig).not.toContain("revision: publicShellRevision");
  });

  it("keeps private routes out of service-worker caching policy", () => {
    const nextConfig = readProjectFile("next.config.ts");
    const serviceWorker = readProjectFile("src/app/sw.ts");
    const privateTopLevelRoutePattern = /^\/(?:api|app)(?:\/|$)/;

    expect(nextConfig).toContain('!/^\\/(?:api|app)(?:\\/|$)/.test(url)');
    expect(privateTopLevelRoutePattern.test("/api/app/groups")).toBe(true);
    expect(privateTopLevelRoutePattern.test("/app/groups")).toBe(true);
    expect(nextConfig).toContain("!/\\/chunks\\/app\\/(?:api|app)\\//.test(url)");
    expect(serviceWorker).toContain(
      "^\\/(?:api|app|account|accounts|group|groups|fund|funds|transaction|transactions|settlement|settlements)(?:\\/|$)",
    );
    expect(serviceWorker).toContain(
      "^\\/_next\\/static\\/chunks\\/app\\/(?:api|app)\\/",
    );
  });

  it("provides an offline navigation fallback without precaching /offline", () => {
    const serviceWorker = readProjectFile("src/app/sw.ts");

    expect(serviceWorker).not.toContain('url: "/offline"');
    expect(serviceWorker).toContain("serwist.setCatchHandler");
    expect(serviceWorker).toContain('request.mode === "navigate"');
  });
});
