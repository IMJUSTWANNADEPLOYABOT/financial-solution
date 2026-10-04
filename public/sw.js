// Finance Auditor service worker.
// Статику кэшируем (cache-first), страницы и данные всегда берём из сети —
// так история всегда актуальна, а без сети показывается заглушка.
const VERSION = "v3";
const STATIC_CACHE = `fa-static-${VERSION}`;
// "/finance-auditor/" — с завершающим слэшем, к нему дописываются пути ресурсов.
const SCOPE = new URL(self.registration.scope).pathname.replace(/\/?$/, "/");
const OFFLINE_URL = `${SCOPE}offline.html`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, `${SCOPE}icons/icon-192.png`]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  const isStatic =
    url.pathname.startsWith(`${SCOPE}_next/static/`) || url.pathname.startsWith(`${SCOPE}icons/`);
  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
