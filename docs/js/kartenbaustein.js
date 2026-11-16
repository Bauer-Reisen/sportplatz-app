// Gemeinsamer Karten-Baustein (Leaflet + Hintergrundkarte von basemap.de / BKG).
// Leaflet wird erst geladen, wenn eine Karte gebraucht wird.

let laden = null;
export function leaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (!laden) {
    laden = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = 'vendor/leaflet/leaflet.css';
      document.head.append(css);
      const s = document.createElement('script');
      s.src = 'vendor/leaflet/leaflet.js';
      s.onload = () => resolve(window.L);
      s.onerror = () => { laden = null; reject(new Error('Die Karte ließ sich nicht laden. Gerade kein Netz?')); };
      document.head.append(s);
    });
  }
  return laden;
}

// Mitte Unterfrankens als Startpunkt
export const START = { lat: 49.95, lon: 9.95, zoom: 9 };

export async function neueKarte(el, { lat = START.lat, lon = START.lon, zoom = START.zoom } = {}) {
  const L = await leaflet();
  const map = L.map(el, { zoomControl: true, attributionControl: true }).setView([lat, lon], zoom);
  L.tileLayer('https://sgx.geodatenzentrum.de/wmts_basemapde/tile/1.0.0/de_basemapde_web_raster_farbe/default/GLOBAL_WEBMERCATOR/{z}/{y}/{x}.png', {
    maxZoom: 19,
    maxNativeZoom: 18,
    attribution: `© <a href="https://www.bkg.bund.de" target="_blank" rel="noopener">GeoBasis-DE / BKG</a> (${new Date().getFullYear()}) <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>`,
  }).addTo(map);
  map.attributionControl.setPrefix(false);
  return { L, map };
}

// Ort suchen (OpenStreetMap / Nominatim). Es wird nur der Suchtext übertragen.
export async function ortSuchen(text) {
  const q = new URLSearchParams({
    q: text, format: 'jsonv2', countrycodes: 'de', limit: '5', 'accept-language': 'de',
    viewbox: '8.9,50.6,10.9,49.4', // Unterfranken bevorzugen
  });
  let res;
  try {
    res = await fetch(`https://nominatim.openstreetmap.org/search?${q}`);
  } catch {
    throw new Error('Die Suche geht gerade nicht. Kein Netz?');
  }
  if (!res.ok) throw new Error('Die Suche geht gerade nicht. Bitte gleich nochmal.');
  const rows = await res.json();
  return rows.map((r) => ({ name: r.display_name.split(',').slice(0, 3).join(','), lat: Number(r.lat), lon: Number(r.lon), typ: r.type }));
}
