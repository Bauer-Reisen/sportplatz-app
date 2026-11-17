// Vereinsliste: alle Fußballplätze der Region aus OpenStreetMap (docs/data/vorschlaege.json,
// erzeugt mit scripts/make-vorschlaege.js). Liegt in der App selbst – beim Suchen geht nichts ins Netz.
// Plätze, die schon in der App angelegt sind, werden nicht nochmal vorgeschlagen.
import { VERSION } from './config.js?v=0.4.7';
import { meters } from './geo.js?v=0.4.7';

let laden = null;
export function vorschlaege() {
  if (!laden) {
    laden = fetch(`data/vorschlaege.json?v=${VERSION}`)
      .then((r) => (r.ok ? r.json() : { p: [] }))
      .then((d) => d.p.map(([verein, ort, lat, lon, heim, stadt], i) => ({ i, verein, ort, lat, lon, heim, stadt, name: verein || `Sportplatz ${ort}` })))
      .catch(() => { laden = null; return []; });
  }
  return laden;
}

// Nur die, die es in der App noch nicht gibt (nichts Angelegtes im Umkreis von 200 m)
export function offen(liste, plaetze = []) {
  return liste.filter((v) => !plaetze.some((p) => Math.abs(p.lat - v.lat) < 0.003 && meters(p.lat, p.lon, v.lat, v.lon) < 200));
}

export const vorschlagLink = (v) => `#/neu/osm/${v.i}`;
