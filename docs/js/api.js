// Verbindung zur gemeinsamen Datenbank. Die Platzliste wird im Handy zwischengespeichert,
// damit sie am Platz auch bei schlechtem Netz da ist.
import { API } from './config.js?v=0.2.1';
import { store } from './store.js?v=0.2.1';

export class ApiError extends Error {
  constructor(status, message, data = {}) { super(message); this.status = status; this.data = data; }
}

async function call(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(API + path, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Gerade kein Netz. Bitte später nochmal versuchen.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || `Fehler ${res.status}`, data);
  return data;
}

// Gemeinsamer Zwischenstand für alle Seiten
export const cache = { plaetze: null, offline: false, geladen: 0 };

function fromStore() {
  try { return JSON.parse(store.get('plaetze') || 'null'); } catch { return null; }
}

// Plätze laden. Höchstens alle 30 Sekunden neu, außer `frisch`.
export async function getPlaetze(frisch = false) {
  if (!frisch && cache.plaetze && Date.now() - cache.geladen < 30_000) return cache.plaetze;
  try {
    const { plaetze } = await call('/api/plaetze');
    cache.plaetze = plaetze;
    cache.offline = false;
    cache.geladen = Date.now();
    store.set('plaetze', JSON.stringify(plaetze));
  } catch (ex) {
    const alt = cache.plaetze || fromStore();
    if (!alt) throw ex;
    cache.plaetze = alt;
    cache.offline = true;
  }
  return cache.plaetze;
}

export async function addPlatz(p) {
  const { platz } = await call('/api/plaetze', { method: 'POST', body: p });
  cache.plaetze = [...(cache.plaetze || []), platz];
  store.set('plaetze', JSON.stringify(cache.plaetze));
  return platz;
}

export const findPlatz = (id) => (cache.plaetze || fromStore() || []).find((p) => p.id === id);
