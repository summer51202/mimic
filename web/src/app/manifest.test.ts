import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("manifest", () => {
  it("describes mimic as an installable standalone app", () => {
    const appManifest = manifest();

    expect(appManifest.name).toBe("mimic");
    expect(appManifest.short_name).toBe("mimic");
    expect(appManifest.display).toBe("standalone");
    expect(appManifest.icons).toEqual(["any", "maskable"].flatMap((purpose) =>
      [192, 512].map((size) => ({
        src: `/pixel-ui/v1/icons/install-warm/icon${purpose === "maskable" ? "-maskable" : ""}-${size}.png`,
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose,
      })),
    ));
  });
});
