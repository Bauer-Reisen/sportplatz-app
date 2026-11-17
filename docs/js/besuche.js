// „Meine Plätze“: welche Plätze du schon besucht hast – wie ein Stempelheft.
// Liegt NUR in diesem Handy (nichts davon geht an den Server).
import { store } from './store.js?v=0.4.1';

const lesen = () => { try { return JSON.parse(store.get('besuche') || '{}'); } catch { return {}; } };
const speichern = (b) => store.set('besuche', JSON.stringify(b));

export const ZIELE = [1, 5, 10, 25, 50, 100, 200];

export function besuche() {
  return Object.entries(lesen())
    .map(([id, x]) => ({ id, ...x, zuletzt: [...x.tage].sort().pop() || '' }))
    .sort((a, b) => b.zuletzt.localeCompare(a.zuletzt) || a.verein.localeCompare(b.verein, 'de'));
}
export const anzahl = () => Object.keys(lesen()).length;
export const warDa = (id) => Boolean(lesen()[id]);

// Merken (beim Bewerten automatisch, sonst per Knopf). tag = 'JJJJ-MM-TT' oder '' für „irgendwann früher“.
// Liefert die neue Anzahl, wenn damit gerade ein Ziel erreicht wurde.
export function merken(p, tag) {
  const b = lesen();
  const neu = !b[p.id];
  const x = b[p.id] || { verein: p.verein, ort: p.ort, tage: [] };
  x.verein = p.verein; x.ort = p.ort;
  if (tag && !x.tage.includes(tag)) x.tage.push(tag);
  b[p.id] = x;
  speichern(b);
  const n = Object.keys(b).length;
  return neu && ZIELE.includes(n) ? n : 0;
}

export function vergessen(id, tag) {
  const b = lesen();
  if (!b[id]) return;
  if (tag) {
    b[id].tage = b[id].tage.filter((t) => t !== tag);
    if (b[id].tage.length || b[id].manuell) { speichern(b); return; }
  }
  delete b[id];
  speichern(b);
}

export function manuell(p, an) {
  if (an) { merken(p, ''); const b = lesen(); b[p.id].manuell = true; speichern(b); }
  else vergessen(p.id);
}

export const alleVergessen = () => store.del('besuche');
