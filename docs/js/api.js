// Verbindung zur gemeinsamen Datenbank. Platzliste und Platzseiten werden im Handy zwischengespeichert,
// damit sie am Platz auch bei schlechtem Netz da sind.
import { API } from './config.js?v=0.4.5';
import { store } from './store.js?v=0.4.5';

export class ApiError extends Error {
  constructor(status, message, data = {}) { super(message); this.status = status; this.data = data; }
}

// Höchstens so lange warten (schwaches Netz am Platz), dann zählt es als „kein Netz“.
const WARTEN = { GET: 8000, POST: 15000 };

export async function call(path, { method = 'GET', body, headers = {} } = {}) {
  let res;
  let data;
  const stopp = new AbortController();
  const uhr = setTimeout(() => stopp.abort(), WARTEN[method] || 15000);
  try {
    res = await fetch(API + path, {
      method,
      headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: stopp.signal,
    });
    data = await res.json().catch(() => ({}));
  } catch {
    throw new ApiError(0, 'Gerade kein Netz. Bitte später nochmal versuchen.');
  } finally {
    clearTimeout(uhr);
  }
  if (!res.ok) throw new ApiError(res.status, data.error || `Fehler ${res.status}`, data);
  return data;
}

// Gemeinsamer Zwischenstand für alle Seiten
export const cache = { plaetze: null, offline: false, geladen: 0 };

const lesen = (k) => { try { return JSON.parse(store.get(k) || 'null'); } catch { return null; } };

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
    const alt = cache.plaetze || lesen('plaetze');
    if (!alt) throw ex;
    cache.plaetze = alt;
    cache.offline = true;
  }
  return cache.plaetze;
}
export const neuLaden = () => { cache.geladen = 0; };

export async function addPlatz(p) {
  const { platz } = await call('/api/plaetze', { method: 'POST', body: p });
  cache.plaetze = [...(cache.plaetze || []), platz];
  store.set('plaetze', JSON.stringify(cache.plaetze));
  return platz;
}

// Sofort anzeigbar: die zuletzt geladene Liste aus dem Handy
export const gespeichertePlaetze = () => cache.plaetze || lesen('plaetze');
export const gespeicherterPlatz = (id) => (lesen('platzSeiten') || {})[id] || null;

// Für Karte und Bewerten: gespeicherte Liste sofort, frische still im Hintergrund
export async function schnellPlaetze() {
  const alt = gespeichertePlaetze();
  if (!alt) return getPlaetze();
  getPlaetze().catch(() => {});
  return alt;
}

export const findPlatz = (id) => (cache.plaetze || lesen('plaetze') || []).find((p) => p.id === id);

// Ein Platz mit Noten und Angebot. Ohne Netz: die zuletzt gesehene Fassung (die letzten 10 Plätze).
export async function getPlatz(id) {
  try {
    const d = await call(`/api/platz/${encodeURIComponent(id)}`);
    const alle = lesen('platzSeiten') || {};
    alle[id] = { ...d, gemerkt: Date.now() };
    const behalten = Object.entries(alle).sort((a, b) => b[1].gemerkt - a[1].gemerkt).slice(0, 10);
    store.set('platzSeiten', JSON.stringify(Object.fromEntries(behalten)));
    return d;
  } catch (ex) {
    if (ex.status) throw ex; // Platz gibt es nicht – dann nicht die alte Fassung zeigen
    const alt = (lesen('platzSeiten') || {})[id];
    if (!alt) throw ex;
    return { ...alt, offline: true };
  }
}

export const melden = (bewertung, geraet, grund) => call('/api/melden', { method: 'POST', body: { bewertung, geraet, grund } });
