import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("manifest", () => {
  it("describes mimic as an installable standalone app", () => {
    const appManifest = manifest();

    expect(appManifest.name).toBe("mimic");
    expect(appManifest.short_name).toBe("mimic");
    expect(appManifest.display).toBe("standalone");
    expect(appManifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sizes: "512x512",
        }),
      ]),
    );
  });
});
