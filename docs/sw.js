// Offline-Speicher der App-Dateien (wie Bike-App).
// Immer zuerst das Netz fragen (höchstens 4 Sekunden), damit Updates sofort ankommen.
// Ohne Netz oder bei schwachem Netz am Platz: die gespeicherte Kopie.
// Daten aus der Datenbank (anderer Server) werden hier NICHT gespeichert.

const VERSION = '0.4.0';
const CACHE = 'halbzeit-' + VERSION;
const DATEIEN = [
  './', 'index.html', 'manifest.webmanifest', 'style.css', 'version.json',
  'js/app.js', 'js/config.js', 'js/store.js', 'js/ui.js', 'js/tabs.js', 'js/tour.js', 'js/news.js', 'js/install.js',
  'js/liste.js', 'js/karte.js', 'js/bewerten.js', 'js/mehr.js',
  'js/api.js', 'js/geo.js', 'js/platz.js', 'js/neu.js', 'js/kartenbaustein.js',
  'js/angebot.js', 'js/senden.js', 'js/verwaltung.js', 'js/suche.js', 'js/vorschlaege.js', 'js/besuche.js', 'js/meine.js', 'data/vorschlaege.json',
  'icons/icon-192.png', 'icons/apple-touch-icon.png',
  'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css',
  'vendor/leaflet/images/marker-icon.png', 'vendor/leaflet/images/marker-icon-2x.png', 'vendor/leaflet/images/marker-shadow.png',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(DATEIEN.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('halbzeit-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Datenbank und fremde Dienste nicht anfassen
  if (url.pathname.endsWith('/version.json')) return; // Update-Prüfung immer frisch

  ev.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const netz = fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    });
    const zeit = new Promise((resolve) => setTimeout(resolve, 4000, null));
    try {
      const res = await Promise.race([netz, zeit]);
      if (res) return res;
    } catch { /* offline */ }
    // ?v=… dient nur dem Neuladen nach Updates – offline zählt die Datei selbst
    const kopie = await cache.match(req, { ignoreSearch: true });
    if (kopie) return kopie;
    return netz; // nichts gespeichert: weiter aufs Netz warten
  })());
});
