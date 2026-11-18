/* Rise service worker: lets the installed app open without internet.
   Pages are fetched fresh when online and fall back to the last saved copy when offline. */
const VERSION = "rise-v1";
const PAGES = ["/", "/habits", "/plans", "/dreams", "/analytics", "/settings"];
const EXTRAS = ["/manifest.webmanifest", "/rise-app-192.png", "/rise-favicon.svg", "/rise-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => Promise.allSettled([...PAGES, ...EXTRAS].map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const store = async (request, response) => {
  // Redirected or failed responses cannot be reused for navigations.
  if (!response || !response.ok || response.redirected || response.type !== "basic") return;
  const cache = await caches.open(VERSION);
  await cache.put(request, response.clone());
};

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

async function pageRequest(request) {
  try {
    const fresh = await withTimeout(fetch(request), 4000);
    store(request, fresh).catch(() => {});
    return fresh;
  } catch {
    const cache = await caches.open(VERSION);
    const path = new URL(request.url).pathname;
    return (await cache.match(request)) || (await cache.match(path)) || (await cache.match("/")) || Response.error();
  }
}

async function assetRequest(request) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(request);
  if (hit) return hit;
  const fresh = await fetch(request);
  store(request, fresh).catch(() => {});
  return fresh;
}

async function otherRequest(request) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(request);
  const refresh = fetch(request).then((res) => { store(request, res).catch(() => {}); return res; });
  if (hit) { refresh.catch(() => {}); return hit; }
  return refresh;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") event.respondWith(pageRequest(request));
  else if (url.pathname.startsWith("/assets/")) event.respondWith(assetRequest(request));
  else event.respondWith(otherRequest(request));
});

// The page lists the files it already loaded so the first offline visit has everything it needs.
self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "cache-urls" || !Array.isArray(event.data.urls)) return;
  event.waitUntil(
    caches.open(VERSION).then((cache) =>
      Promise.allSettled(
        event.data.urls
          .filter((u) => typeof u === "string" && new URL(u, self.location.origin).origin === self.location.origin)
          .map((u) => cache.add(u)),
      ),
    ),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const open = list[0];
      return open ? open.focus() : self.clients.openWindow("/plans");
    }),
  );
});
