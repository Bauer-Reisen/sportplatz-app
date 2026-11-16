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
// Zuerst Photon (komoot): verzeiht Tippfehler und Wortreihenfolge und kennt oft den Sportplatz selbst.
// Findet Photon nichts, ohne Vereinskürzel nochmal – und zuletzt Nominatim (OpenStreetMap).
// Ergebnis: [{ name, lat, lon, sport }] – `sport` = Sportplatz/Sportheim, dann setzt die App gleich die Nadel.
const SPORT = new Set(['pitch', 'sports_centre', 'stadium', 'sport', 'sports_hall', 'recreation_ground']);
const KUERZEL = /\b(1\.|tsv|tsvgg|sv|fc|djk|spvgg|tus|sc|fv|sg|asv|vfb|vfl|tsg|tv|ssv|esv|sportplatz|sportheim|sportgelände|e\.?\s?v\.?)\b/gi;

async function photon(q) {
  const p = new URLSearchParams({ q, lang: 'de', limit: '8', lat: '50.0', lon: '10.0', location_bias_scale: '0.3' });
  const res = await fetch(`https://photon.komoot.io/api/?${p}`);
  if (!res.ok) throw new Error(`photon ${res.status}`);
  const { features = [] } = await res.json();
  return features
    .filter((f) => f.properties.countrycode === 'DE')
    .map((f) => {
      const x = f.properties;
      const wo = [x.district || x.city || x.locality, x.county].filter((s) => s && s !== x.name);
      return { name: [x.name, ...wo].filter(Boolean).join(', '), lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], sport: SPORT.has(x.osm_value) || x.osm_key === 'leisure' && /sport|pitch/.test(x.osm_value) };
    });
}

async function nominatim(q) {
  const p = new URLSearchParams({ q, format: 'jsonv2', countrycodes: 'de', limit: '5', 'accept-language': 'de', viewbox: '8.9,50.6,10.9,49.4' });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${p}`);
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  return (await res.json()).map((r) => ({ name: r.display_name.split(',').slice(0, 3).join(','), lat: Number(r.lat), lon: Number(r.lon), sport: SPORT.has(r.type) }));
}

export async function ortSuchen(text) {
  const ohne = text.replace(KUERZEL, ' ').replace(/[\d/]+/g, ' ').replace(/\s+/g, ' ').trim();
  const versuche = [() => photon(text)];
  if (ohne && ohne.toLowerCase() !== text.toLowerCase()) versuche.push(() => photon(ohne));
  versuche.push(() => nominatim(text));
  if (ohne && ohne.toLowerCase() !== text.toLowerCase()) versuche.push(() => nominatim(ohne));
  let fehler = 0;
  for (const v of versuche) {
    try {
      const rows = await v();
      if (rows.length) {
        // gleiche Stellen nur einmal
        const seen = new Set();
        return rows.filter((r) => { const k = `${r.lat.toFixed(3)},${r.lon.toFixed(3)}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 6);
      }
    } catch { fehler++; }
  }
  if (fehler === versuche.length) throw new Error('Die Suche geht gerade nicht. Kein Netz?');
  return [];
}
