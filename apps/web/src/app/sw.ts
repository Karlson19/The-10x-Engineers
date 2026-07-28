import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const apiOrigin = API_URL ? new URL(API_URL).origin : "";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    /**
     * Read requests to the API are served from cache first and refreshed in the
     * background, so someone returning to the app sees their vehicles and their
     * requests instantly rather than staring at skeletons over 3G.
     */
    {
      matcher: ({ url, request }) =>
        apiOrigin !== "" && url.origin === apiOrigin && request.method === "GET",
      handler: new StaleWhileRevalidate({
        cacheName: "chrysmec-api",
        plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },

    /**
     * Everything that changes data goes to the network only. A cached POST
     * would be worse than useless: the outbox already handles writes made
     * offline, and it does it with an idempotency key.
     */
    {
      matcher: ({ url, request }) =>
        apiOrigin !== "" && url.origin === apiOrigin && request.method !== "GET",
      handler: new NetworkOnly(),
    },

    // Self-hosted fonts never change, so they can be kept for a year.
    {
      matcher: ({ request }) => request.destination === "font",
      handler: new CacheFirst({
        cacheName: "chrysmec-fonts",
        plugins: [new ExpirationPlugin({ maxEntries: 12, maxAgeSeconds: 365 * 24 * 60 * 60 })],
      }),
    },

    ...defaultCache,
  ],
});

serwist.addEventListeners();
