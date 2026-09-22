// Plantilla del service worker (~40 línies). `scripts/postbuild.mjs` hi
// anteposa `const VERSION = "...";` i `const PRECACHE = [...];` i escriu el
// resultat a `out/sw.js` — mai `.replace()` sobre un placeholder (les URL
// poden contenir `$`), sempre concatenació de text pla.
//
// App d'una sola pàgina: cap navegació de Next (no s'usa `next/link`), així
// que el precache només necessita `/`, `_next/static/**`, el manifest i les
// icones — mai els fitxers `__next.*.txt` de segments RSC.

const PRECACHE_NAME = "mygym-pre-" + VERSION;
const RUNTIME_NAME = "mygym-rt-" + VERSION;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" })))),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith("mygym-") && name !== PRECACHE_NAME && name !== RUNTIME_NAME)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname === "/sw.js") return;

  event.respondWith(
    (async () => {
      const precache = await caches.open(PRECACHE_NAME);
      const precached = await precache.match(url.pathname, { ignoreSearch: true });
      if (precached) return precached;

      const runtime = await caches.open(RUNTIME_NAME);
      const cachedRuntime = await runtime.match(url.pathname, { ignoreSearch: true });
      if (cachedRuntime) return cachedRuntime;

      try {
        const response = await fetch(req);
        if (response.ok && response.type === "basic") runtime.put(req, response.clone());
        return response;
      } catch {
        if (req.mode === "navigate") {
          const shell = await precache.match("/", { ignoreSearch: true });
          if (shell) return shell;
        }
        return Response.error();
      }
    })(),
  );
});
