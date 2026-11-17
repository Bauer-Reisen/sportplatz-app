// Offline-Speicher der App-Dateien.
// Schnell: Dateien dieser Version kommen sofort aus dem Handy, ohne aufs Netz zu warten.
// Die Startseite kommt ebenfalls sofort aus dem Handy und wird im Hintergrund aufgefrischt.
// Updates: app.js merkt eine neue Version (version.json) und lädt mit ?v=<neu> – das geht immer übers Netz.
// Daten aus der Datenbank (anderer Server) werden hier NICHT gespeichert.

const VERSION = '0.4.3';
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

// Netz fragen, höchstens `ms` lang; danach (oder ohne Netz) die Kopie aus dem Handy.
async function netzZuerst(req, cache, ms) {
  const netz = fetch(req).then((res) => {
    if (res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  });
  netz.catch(() => { /* offline */ });
  const zeit = new Promise((resolve) => setTimeout(resolve, ms, null));
  try {
    const res = await Promise.race([netz, zeit]);
    if (res) return res;
  } catch { /* offline */ }
  const kopie = await cache.match(req, { ignoreSearch: true });
  return kopie || netz; // nichts gespeichert: weiter aufs Netz warten
}

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Datenbank und fremde Dienste nicht anfassen
  if (url.pathname.endsWith('/version.json')) return; // Update-Prüfung immer frisch

  const v = url.searchParams.get('v');
  ev.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Andere Version angefragt (gerade ein Update): übers Netz, sonst klappt das Update nicht
    if (v && v !== VERSION) return netzZuerst(req, cache, 8000);
    const kopie = await cache.match(req, { ignoreSearch: true });
    if (kopie) {
      // Startseite und Dateien ohne Versionsnummer im Hintergrund auffrischen
      if (!v) {
        ev.waitUntil(fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') return cache.put(req, res);
        }).catch(() => {}));
      }
      return kopie;
    }
    return netzZuerst(req, cache, 8000);
  })());
});
