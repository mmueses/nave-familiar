/* Hace que el juego se pueda instalar como app y abrir sin Internet (para jugar solo).
   Siempre intenta primero la versión nueva de Internet; si no hay conexión, usa la guardada. */
var CACHE = 'nave-familiar'; // v26
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    // no-cache: pregunta siempre a GitHub si hay versión nueva (si no, el navegador podía usar la vieja hasta 10 minutos)
    fetch(req.mode === 'navigate' ? req.url : req, { cache: 'no-cache' }).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: false }).then(function (r) {
        return r || caches.match(req, { ignoreSearch: true });
      });
    })
  );
});
