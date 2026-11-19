// Warteschlange für Bewertungen: erst im Handy speichern, dann senden.
// So geht nichts verloren, wenn am Platz kein Netz ist, und man hat 5 Sekunden zum Rückgängigmachen.
// Die Gerätenummer ist eine Zufallszahl – sie verrät nichts über dich; der Server speichert sie nicht.
import { store } from './store.js?v=0.4.8';
import { call, neuLaden } from './api.js?v=0.4.8';
import { toast } from './ui.js?v=0.4.8';

export const WARTEN_MS = 5_000;

export function geraet() {
  let g = store.get('geraet');
  if (!g) {
    g = crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
    store.set('geraet', g);
  }
  return g;
}

export const neueId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);
export const heute = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());

const lesen = (k, leer) => { try { return JSON.parse(store.get(k) || 'null') ?? leer; } catch { return leer; } };
const schlange = () => lesen('warteschlange', []);
const speichern = (q) => store.set('warteschlange', JSON.stringify(q));

// „Heute schon bewertet“ – im Handy gemerkt (der Server prüft es außerdem)
export const heuteBewertet = (platz) => lesen('bewertet', {})[platz] === heute();
function merken(platz, an) {
  const b = lesen('bewertet', {});
  for (const [k, v] of Object.entries(b)) if (v !== heute()) delete b[k];
  if (an) b[platz] = heute(); else delete b[platz];
  store.set('bewertet', JSON.stringify(b));
}

export const wartend = (platz) => schlange().filter((x) => !platz || x.body.platz === platz);

export function einreihen(body) {
  const q = schlange();
  q.push({ body: { ...body, geraet: geraet() }, zeit: Date.now() });
  speichern(q);
  merken(body.platz, true);
  setTimeout(abarbeiten, WARTEN_MS + 300);
}

export function zuruecknehmen(id) {
  const q = schlange();
  const x = q.find((e) => e.body.id === id);
  if (!x) return false; // schon gesendet
  speichern(q.filter((e) => e !== x));
  merken(x.body.platz, false);
  return true;
}

const weg = (id) => speichern(schlange().filter((e) => e.body.id !== id));
const melde = (platz) => dispatchEvent(new CustomEvent('halbzeit:gesendet', { detail: platz }));

let laeuft = false;
export async function abarbeiten() {
  if (laeuft || !navigator.onLine) return;
  laeuft = true;
  try {
    for (const x of schlange()) {
      const alter = Date.now() - x.zeit;
      if (alter < WARTEN_MS) { setTimeout(abarbeiten, WARTEN_MS - alter + 300); continue; }
      if (!schlange().some((e) => e.body.id === x.body.id)) continue; // inzwischen zurückgenommen
      try {
        await call('/api/bewertungen', { method: 'POST', body: x.body });
        weg(x.body.id);
        neuLaden();
        if (navigator.vibrate) navigator.vibrate(40);
        melde(x.body.platz);
      } catch (ex) {
        // Kein Netz, Server überlastet oder pausiert: später nochmal
        if (ex.status === 0 || ex.status === 429 || ex.status >= 500) break;
        // Klappt nie (z. B. heute schon bewertet): Bescheid sagen und verwerfen
        weg(x.body.id);
        toast(ex.message, 5000);
        melde(x.body.platz);
      }
    }
  } finally {
    laeuft = false;
  }
}

export function senderStarten() {
  abarbeiten();
  addEventListener('online', abarbeiten);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') abarbeiten(); });
}
