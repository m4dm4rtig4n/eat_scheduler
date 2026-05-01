import { readFileSync } from "node:fs";
import path from "node:path";

export const dynamic = "force-static";

const pkg = JSON.parse(
  readFileSync(path.join(process.cwd(), "package.json"), "utf-8")
);
const VERSION: string = pkg.version;

const SW_BODY = `// Auto-generated. Version is read from package.json at build time.
const APP_VERSION = "${VERSION}";
const STATIC_CACHE = \`eat-scheduler-static-\${APP_VERSION}\`;
const RUNTIME_CACHE = \`eat-scheduler-runtime-\${APP_VERSION}\`;

const PRECACHE_URLS = [
  "/manifest.json",
  "/icon-192.svg",
  "/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const validCaches = new Set([STATIC_CACHE, RUNTIME_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !validCaches.has(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // _next/static est immutable (hash dans le filename) → cache-first agressif
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icon-")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML et API : network-first, fallback cache si offline
  // Garantit qu'apres un deploy, le HTML servi pointe vers les nouveaux chunks _next/static
  const isNavigate = request.mode === "navigate" || url.pathname.startsWith("/api/");
  if (isNavigate) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached ?? Response.error()))
    );
    return;
  }
});
`;

export function GET() {
  return new Response(SW_BODY, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
