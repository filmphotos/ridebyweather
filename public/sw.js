// RideByWeather service worker.
// - Handles storm push notifications.
// - Implements a minimal fetch handler so Chrome considers the app installable
//   and so navigations have a basic offline fallback.

const CACHE_VERSION = "rbw-v3";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_VERSION);
        await cache.addAll(PRECACHE_URLS);
      } catch {
        // best-effort precache; do not block install
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Network-first for navigations with an offline HTML fallback.
// Pass-through for everything else (let the browser/CDN handle caching).
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          const cache = await caches.open(CACHE_VERSION);
          const offline = await cache.match(OFFLINE_URL);
          return (
            offline ||
            new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })
          );
        }
      })()
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "RideByWeather", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "⚡ Storm alert";
  const options = {
    body: data.body || "Lightning detected near your location.",
    tag: data.tag || "storm-alert",
    renotify: true,
    requireInteraction: false,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    vibrate: [200, 100, 200, 100, 400],
    data: {
      url: data.url || "/",
      hoursAway: data.hoursAway ?? null,
      locationName: data.locationName ?? null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(url).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
