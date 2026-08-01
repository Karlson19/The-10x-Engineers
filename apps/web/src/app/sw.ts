import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist } from "serwist";

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
     * Read requests to the API go to the network first, and fall back to the
     * cache when it does not answer.
     *
     * This was stale-while-revalidate, which is what the build specification
     * asks for, and it made the app look broken. Every read was served from
     * cache first, so the refetch that follows a booking, an approval or a new
     * vehicle painted the data from *before* the change and only corrected
     * itself on the next load. The report was "if you do not refresh after an
     * action you see nothing happen", and that was exactly right.
     *
     * Because the service worker is disabled in development, it only ever
     * happened on the deployed app.
     *
     * The three second timeout keeps what stale-while-revalidate was for: on a
     * slow connection the cached copy still arrives quickly rather than leaving
     * someone watching a skeleton, and offline it is all there is. What it no
     * longer does is hand back a stale answer when the network was perfectly
     * capable of giving a fresh one.
     */
    {
      matcher: ({ url, request }) =>
        apiOrigin !== "" && url.origin === apiOrigin && request.method === "GET",
      handler: new NetworkFirst({
        cacheName: "chrysmec-api",
        networkTimeoutSeconds: 3,
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
