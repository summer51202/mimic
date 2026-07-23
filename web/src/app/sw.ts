/// <reference lib="webworker" />

import type {
  PrecacheEntry,
  SerwistGlobalConfig,
  RuntimeCaching,
} from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[];
  }
}

declare const self: ServiceWorkerGlobalScope & WorkerGlobalScope;

const privatePathPattern =
  /^\/(?:api|app|account|accounts|group|groups|fund|funds|transaction|transactions|settlement|settlements)(?:\/|$)/;
const privateStaticChunkPattern = /^\/_next\/static\/chunks\/app\/(?:api|app)\//;
const publicPagePattern = /^\/(?:$|features\/?$|privacy\/?$|terms\/?$|offline\/?$)/;

const isSameOriginPrivateRequest = ({
  request,
  sameOrigin,
  url,
}: {
  request: Request;
  sameOrigin: boolean;
  url: URL;
}) => {
  if (!sameOrigin) {
    return false;
  }

  const nextUrl = request.headers.get("Next-Url");
  return (
    privatePathPattern.test(url.pathname) ||
    privateStaticChunkPattern.test(url.pathname) ||
    (nextUrl !== null && privatePathPattern.test(nextUrl))
  );
};

const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: isSameOriginPrivateRequest,
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ sameOrigin, url }) =>
      sameOrigin && /^\/_next\/static\//.test(url.pathname),
    handler: new CacheFirst({
      cacheName: "mimic-next-static",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 96,
          maxAgeSeconds: 30 * 24 * 60 * 60,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  {
    matcher: ({ sameOrigin, url }) =>
      sameOrigin && /^\/icons\/.+\.png$/.test(url.pathname),
    handler: new CacheFirst({
      cacheName: "mimic-install-icons",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 8,
          maxAgeSeconds: 365 * 24 * 60 * 60,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  {
    matcher: ({ request, sameOrigin, url }) =>
      sameOrigin &&
      request.mode === "navigate" &&
      publicPagePattern.test(url.pathname),
    handler: new NetworkFirst({
      cacheName: "mimic-public-pages",
      networkTimeoutSeconds: 3,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 8,
          maxAgeSeconds: 7 * 24 * 60 * 60,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  {
    matcher: ({ sameOrigin, url }) =>
      sameOrigin && /^\/brand\/mimiku-(?:happy|idle)\.png$/.test(url.pathname),
    handler: new CacheFirst({
      cacheName: "mimic-public-brand",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 4,
          maxAgeSeconds: 30 * 24 * 60 * 60,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
];

const offlineFallbackHtml = `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>mimic offline</title>
    <meta name="theme-color" content="#f4bd32" />
    <style>
      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        background: #fffaf0;
        color: #10152f;
        font-family: Arial, Helvetica, sans-serif;
      }
      main {
        max-width: 32rem;
        padding: 2rem;
        text-align: center;
      }
      h1 {
        font-size: 2rem;
        margin: 0 0 1rem;
      }
      p {
        line-height: 1.6;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>mimic 離線中</h1>
      <p>一起存，一起花，一起在異世界探險吧!</p>
    </main>
  </body>
</html>`;

const serwist = new Serwist({
  cacheId: "mimic",
  clientsClaim: true,
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    cleanupOutdatedCaches: true,
  },
  runtimeCaching,
});

serwist.setCatchHandler(async ({ request }) => {
  if (request.mode === "navigate") {
    return new Response(offlineFallbackHtml, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
      status: 200,
    });
  }

  return Response.error();
});

serwist.addEventListeners();
