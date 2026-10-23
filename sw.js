// Service worker: permite instalar la app en el celular y mostrar los recordatorios.
// Guarda solo los archivos propios de la página; los datos siempre vienen del servidor.
var CACHE = 'viviendo-por-fe-v6';
var ARCHIVOS = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'favicon.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARCHIVOS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // servidor, Biblia y PDF van directo a internet
  e.respondWith(fetch(e.request).then(function (r) {
    var copia = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copia); }); return r;
  }).catch(function () { return caches.match(e.request); }));
});

// Recordatorios enviados por el servidor (Firebase Cloud Messaging, mensajes de datos)
self.addEventListener('push', function (e) {
  var p = {};
  try { p = e.data ? e.data.json() : {}; } catch (x) { p = { data: { cuerpo: e.data ? e.data.text() : '' } }; }
  var d = p.data || {}, n = p.notification || {};
  var opciones = {
    body: d.cuerpo || n.body || '',
    icon: 'icon-192.png',
    data: { ir: d.ir || 'inicio' },
    lang: 'es'
  };
  if (d.tag) { opciones.tag = d.tag; opciones.renotify = true; }
  e.waitUntil(self.registration.showNotification(d.titulo || n.title || 'Viviendo por Fe', opciones));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var ir = (e.notification.data && e.notification.data.ir) || 'inicio';
  var destino = new URL('./#ir=' + encodeURIComponent(ir), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (ventanas) {
    for (var i = 0; i < ventanas.length; i++) {
      var w = ventanas[i];
      if (w.url.indexOf(self.registration.scope) === 0 && 'focus' in w) {
        w.postMessage({ ir: ir });
        return w.focus();
      }
    }
    return self.clients.openWindow(destino);
  }));
});
