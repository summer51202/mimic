import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: {
    position: "top-right",
  },
};

const installIconUrls = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
];

function revisionForPublicFile(url: string) {
  return createHash("sha256")
    .update(readFileSync(`public${url}`))
    .digest("hex");
}

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  swUrl: "/sw.js",
  scope: "/",
  register: false,
  cacheOnNavigation: false,
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: installIconUrls.map((url) => ({
    url,
    revision: revisionForPublicFile(url),
  })),
  manifestTransforms: [
    (manifestEntries) => ({
      manifest: manifestEntries
        .map((entry) => ({
          ...entry,
          url: entry.url.replace(/\\/g, "/"),
        }))
        .filter(({ url }) => {
          return (
            !/^\/(?:api|app)(?:\/|$)/.test(url) &&
            !/\/chunks\/app\/(?:api|app)\//.test(url)
          );
        }),
      warnings: [],
    }),
  ],
});

export default withSerwist(nextConfig);
