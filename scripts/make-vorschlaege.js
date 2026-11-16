// Erzeugt docs/data/vorschlaege.json: alle Fußballplätze der Region aus OpenStreetMap.
// Damit findet die App Plätze sofort (auch mit Tippfehlern) und legt sie mit einem Tipp an.
// Aufruf (ab und zu neu, z. B. einmal im Jahr):  NODE_USE_SYSTEM_CA=1 node scripts/make-vorschlaege.js
// Daten: © OpenStreetMap-Mitwirkende, Lizenz ODbL (Hinweis steht in der App unter „Deine Daten“).
import { writeFileSync, mkdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Rohdaten 1 Tag zwischenspeichern (zum Nachbessern der Auswertung ohne neues Laden)
const ROH = join(tmpdir(), 'halbzeit-osm-roh.json');

// Unterfranken mit etwas Rand (Süd, West, Nord, Ost)
const BOX = [49.45, 8.95, 50.6, 10.95];
const b = BOX.join(',');
// In 4 Teilen abfragen – eine große Abfrage brechen die Server oft ab
const sportQ = (bb) => `[out:json][timeout:120];
(
  nwr["leisure"="pitch"]["sport"~"soccer"](${bb});
  nwr["leisure"~"sports_centre|stadium"]["sport"~"soccer"](${bb});
  nwr["club"="sport"]["sport"~"soccer"](${bb});
  nwr["amenity"~"restaurant|pub|bar|cafe"]["name"~"Sportheim|Sportgaststätte|Sportgaststaette|Vereinsheim|Sportlerheim|Clubhaus|Kiosk",i](${bb});
);
out center bb tags;`;
const [S, W, N, O] = BOX;
const mLat = (S + N) / 2;
const mLon = (W + O) / 2;
const TEILE = [[S, W, mLat, mLon], [S, mLon, mLat, O], [mLat, W, N, mLon], [mLat, mLon, N, O]].map((t) => t.join(','));
const ORTE_Q = `[out:json][timeout:120];
node["place"~"city|town|village|suburb|hamlet|quarter"]["name"](${b});
out;`;

const SERVER = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function holen(query, was) {
  for (let runde = 0; runde < 4; runde++) {
    for (const url of SERVER) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'User-Agent': 'halbzeit-check-generator', 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(query),
          signal: AbortSignal.timeout(200_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = await res.json();
        if (d.remark) throw new Error(`unvollständig: ${d.remark}`); // Server hat abgebrochen
        console.log(`${was}: ${d.elements.length} Einträge`);
        return d.elements;
      } catch (ex) { console.warn(`${was} ${new URL(url).host}: ${ex.message}`); }
    }
    await pause(20_000);
  }
  console.error(`${was}: keine vollständigen Daten bekommen.`);
  process.exit(1);
}
let data;
if (existsSync(ROH) && Date.now() - statSync(ROH).mtimeMs < 86_400_000) {
  data = JSON.parse(readFileSync(ROH, 'utf8'));
  console.log('Rohdaten von heute wiederverwendet.');
} else {
  const elemente = [];
  const gesehen = new Set();
  for (let i = 0; i < TEILE.length; i++) {
    for (const e of await holen(sportQ(TEILE[i]), `Sportplätze Teil ${i + 1}/4`)) {
      const k = `${e.type}${e.id}`; // an den Teil-Grenzen kann etwas doppelt kommen
      if (!gesehen.has(k)) { gesehen.add(k); elemente.push(e); }
    }
  }
  data = { elements: [...elemente, ...(await holen(ORTE_Q, 'Orte'))] };
  if (!data.elements.some((e) => e.tags?.place && e.lat)) { console.error('Orte ohne Lage – nichts geschrieben.'); process.exit(1); }
  writeFileSync(ROH, JSON.stringify(data));
}
if (data.elements.length < 1000) { console.error('Verdächtig wenige Einträge – nichts geschrieben.'); process.exit(1); }

const R = Math.PI / 180;
const meters = (a1, o1, a2, o2) => Math.hypot((o2 - o1) * R * Math.cos(((a1 + a2) / 2) * R), (a2 - a1) * R) * 6371000;
const lage = (e) => (e.center ? [e.center.lat, e.center.lon]
  : e.bounds ? [(e.bounds.minlat + e.bounds.maxlat) / 2, (e.bounds.minlon + e.bounds.maxlon) / 2]
  : [e.lat, e.lon]);

const orte = [];
const sport = [];
for (const e of data.elements) {
  const t = e.tags || {};
  if (t.place) { orte.push({ name: t.name, typ: t.place, rang: { city: 1, town: 2, suburb: 2, quarter: 3, village: 3, hamlet: 4, isolated_dwelling: 5 }[t.place] || 5, ll: lage(e) }); continue; }
  const [lat, lon] = lage(e);
  if (lat == null) continue;
  let diag = null;
  if (e.bounds) diag = meters(e.bounds.minlat, e.bounds.minlon, e.bounds.maxlat, e.bounds.maxlon);
  const art = t.club ? 'club' : t.amenity ? 'heim' : t.leisure === 'pitch' ? 'pitch' : 'anlage';
  sport.push({ lat, lon, art, name: (t.name || '').trim(), diag });
}

// Vereinsnamen erkennen und aufräumen
const VEREIN = /\b(TSV|TSVgg|SV|FC|DJK|SpVgg|TuS|SC|FV|SG|ASV|VfB|VfL|TSG|TV|SSV|ESV|BSC|FSV|SKV|SpG|JFG|Sportverein|Turnverein|Kickers|Viktoria|Eintracht|Germania|Alemannia)\b/i;
const VORSATZ = /^(Sportheimgaststätte|Sportheim|Sportlerheim|Sportgaststätte|Sportgaststaette|Vereinsheim|Clubhaus|Kiosk|Sportplatz|Waldsportplatz|Hauptplatz|Nebenplatz|Trainingsplatz|Sportgelände|Sportanlage|Fußballplatz|Fussballplatz|Rasenplatz|Kunstrasenplatz)\b[\s:–-]*(des|der|vom)?\s*/i;
function vereinAus(name) {
  if (!name) return '';
  let n = name.replace(/["„“]/g, '').replace(/^(alter|neuer|ehemaliger)\s+/i, '').trim();
  for (let i = 0; i < 2; i++) n = n.replace(VORSATZ, '').trim();
  n = n.replace(/\be\.\s?V\.?/gi, ' ').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 2; i++) {
    n = n.replace(/[\s,–-]+(Sportheim|Sportlerheim|Vereinsheim|Sportgelände|Sportplatz|Sportanlage|Gaststätte|Vereinsgaststätte|[AB]-Platz|Hauptplatz|Nebenplatz|Trainingsplatz|Platz\s*\d)$/i, '').trim();
  }
  return VEREIN.test(n) && n.length <= 60 ? n : '';
}

// Bolzplätze an Schulen u. Ä. weglassen: kleiner als ca. 70 × 45 m und ohne Namen
const echt = sport.filter((s) => s.art !== 'pitch' || s.name || s.diag == null || s.diag >= 85);

// Nahe beieinander (300 m) = ein Sportgelände
const gelaende = [];
for (const s of echt.sort((a, b2) => (a.art === 'pitch') - (b2.art === 'pitch'))) {
  const g = gelaende.find((x) => meters(x.lat, x.lon, s.lat, s.lon) < 300);
  if (g) g.teile.push(s);
  else gelaende.push({ lat: s.lat, lon: s.lon, teile: [s] });
}

const out = [];
for (const g of gelaende) {
  if (!g.teile.some((t) => t.art !== 'heim')) continue; // nur eine Gaststätte, kein Platz
  // Lage: Mitte der Spielfelder (sonst Mitte von allem)
  const felder = g.teile.filter((t) => t.art === 'pitch');
  const basis = felder.length ? felder : g.teile;
  const lat = basis.reduce((s, t) => s + t.lat, 0) / basis.length;
  const lon = basis.reduce((s, t) => s + t.lon, 0) / basis.length;
  // Name: Verein > Sportheim > Anlage > Spielfeld
  let verein = '';
  for (const art of ['club', 'heim', 'anlage', 'pitch']) {
    for (const t of g.teile.filter((x) => x.art === art)) { verein = vereinAus(t.name); if (verein) break; }
    if (verein) break;
  }
  // Ort: nächster Ort (kleine Orte zählen mehr – sonst hieße alles „Würzburg“)
  let ort = '';
  let best = Infinity;
  for (const o of orte) {
    const m = meters(lat, lon, o.ll[0], o.ll[1]);
    const wert = m * (o.rang <= 2 ? 1.6 : 1);
    if (m < 5000 && wert < best) { best = wert; ort = o.name; }
  }
  if (!ort && !verein) continue;
  if (verein && !/\s/.test(verein) && ort) verein = `${verein} ${ort}`; // nur „TSV“ → „TSV Ort“
  const heim = g.teile.some((t) => t.art === 'heim') ? 1 : 0;
  // nächste Stadt (zum Unterscheiden gleichnamiger Orte, z. B. „Hausen · bei Bad Kissingen“)
  let stadt = '';
  let sm = 25_000;
  for (const o of orte) {
    if ((o.typ !== 'town' && o.typ !== 'city') || o.name === ort) continue;
    const m = meters(lat, lon, o.ll[0], o.ll[1]);
    if (m < sm) { sm = m; stadt = o.name; }
  }
  out.push([verein, ort, Math.round(lat * 1e4) / 1e4, Math.round(lon * 1e4) / 1e4, heim, stadt]);
}
out.sort((a, b2) => (a[1] + a[0]).localeCompare(b2[1] + b2[0], 'de'));

mkdirSync('docs/data', { recursive: true });
const datei = {
  stand: new Date().toISOString().slice(0, 10),
  quelle: '© OpenStreetMap-Mitwirkende, ODbL',
  felder: ['verein', 'ort', 'lat', 'lon', 'sportheim', 'naheStadt'],
  p: out,
};
writeFileSync('docs/data/vorschlaege.json', JSON.stringify(datei));
console.log(`✓ ${out.length} Sportgelände (${out.filter((x) => x[0]).length} mit Verein, ${out.filter((x) => x[4]).length} mit Sportheim) → docs/data/vorschlaege.json`);
