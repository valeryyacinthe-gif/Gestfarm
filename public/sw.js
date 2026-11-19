
/* GESTFARM — cache hors connexion de l'interface uniquement.
   Les requêtes Supabase ne sont jamais mises en cache. */
const CACHE_NAME = "gestfarm-shell-v1";
const APP_ROOT = "/";

function isSupabaseRequest(url) {
  return /(^|\.)supabase\.co$/i.test(url.hostname) ||
    url.pathname.startsWith("/auth/v1/") ||
    url.pathname.startsWith("/rest/v1/") ||
    url.pathname.startsWith("/storage/v1/") ||
    url.pathname.startsWith("/functions/v1/");
}

function isStaticAsset(url) {
  return url.pathname.startsWith("/assets/") ||
    /\.(?:js|mjs|css|woff2?|ttf|otf|svg|png|jpe?g|webp|ico)$/i.test(url.pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch(APP_ROOT, { cache: "reload" });
    if (!response.ok) throw new Error("Impossible de mettre en cache l'interface GESTFARM.");
    const html = await response.clone().text();
    await cache.put(APP_ROOT, response);

    const assetPaths = new Set();
    const patterns = [/(?:src|href)=["']([^"']+)["']/g];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        try {
          const assetUrl = new URL(match[1], self.location.origin);
          if (assetUrl.origin === self.location.origin && isStaticAsset(assetUrl)) {
            assetPaths.add(assetUrl.pathname + assetUrl.search);
          }
        } catch (_) {}
      }
    }
    await Promise.all([...assetPaths].map(async (path) => {
      try {
        const assetResponse = await fetch(path, { cache: "reload" });
        if (assetResponse.ok) await cache.put(path, assetResponse);
      } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(
      (key) => key.startsWith("gestfarm-shell-") && key !== CACHE_NAME
    ).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isSupabaseRequest(url)) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(APP_ROOT, fresh.clone());
        }
        return fresh;
      } catch (_) {
        const cached = await caches.match(APP_ROOT);
        return cached || new Response(
          "GESTFARM est hors connexion. Ouvre l'application après une première visite avec Internet.",
          {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          }
        );
      }
    })());
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const fresh = await fetch(request);
      if (fresh && fresh.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, fresh.clone());
      }
      return fresh;
    })());
  }
});
