// Cloudflare Worker „sportplatz“: die einzige Tür zur gemeinsamen Datenbank.
// - Nur die eigene Website darf ihn benutzen (ALLOWED_ORIGINS).
// - Jeder darf lesen und Neues anlegen; ändern oder löschen kann über diese Tür niemand.
// - Alle Eingaben werden hier geprüft – was die App vorher prüft, ist nur Bequemlichkeit.
// Hier im Code steht nichts Geheimes.

const MAX_NEUE_PLAETZE_PRO_TAG = 40;   // alle zusammen – Bremse gegen Unsinn
const DOPPELT_METER = 150;             // so nah an einem bestehenden Platz = vermutlich derselbe
// Grob Deutschland (mit Rand) – sonst ist die Lage vermutlich falsch
const LAT = [47.0, 55.2];
const LON = [5.5, 15.5];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const cors = allowed.includes(origin)
      ? {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          Vary: 'Origin',
        }
      : {};
    const reply = (status, body) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors },
      });

    if (url.pathname === '/api/health') return reply(200, { ok: true });
    if (!cors['Access-Control-Allow-Origin']) return reply(403, { error: 'Herkunft nicht erlaubt' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Max-Age': '86400' } });

    const db = env.DB;
    const all = async (sql, ...args) => (await db.prepare(sql).bind(...args).all()).results;
    const one = (sql, ...args) => db.prepare(sql).bind(...args).first();
    const run = (sql, ...args) => db.prepare(sql).bind(...args).run();
    const path = url.pathname;
    const method = request.method;

    try {
      if (method === 'POST' && env.WRITE_LIMITER) {
        const ip = request.headers.get('CF-Connecting-IP') || 'lokal';
        const { success } = await env.WRITE_LIMITER.limit({ key: ip });
        if (!success) return reply(429, { error: 'Zu viele Anfragen. Bitte eine Minute warten.' });
      }

      // ---------- Alle Plätze ----------
      if (path === '/api/plaetze' && method === 'GET') {
        const plaetze = await all('SELECT id, verein, ort, lat, lon, angelegt FROM plaetze WHERE versteckt = 0 ORDER BY ort, verein');
        return reply(200, { plaetze, heute: today() });
      }

      // ---------- Neuen Platz anlegen ----------
      if (path === '/api/plaetze' && method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const verein = clean(b.verein, 60);
        const ort = clean(b.ort, 40);
        const lat = round4(b.lat);
        const lon = round4(b.lon);
        if (verein.length < 2) return reply(400, { error: 'Bitte den Verein eintragen.' });
        if (ort.length < 2) return reply(400, { error: 'Bitte den Ort eintragen.' });
        if (!(lat >= LAT[0] && lat <= LAT[1] && lon >= LON[0] && lon <= LON[1])) {
          return reply(400, { error: 'Die Lage stimmt nicht. Bitte am Platz „Lage übernehmen“ tippen.' });
        }
        // Gibt es den Platz schon? (Kasten grob vorfiltern, dann genau messen)
        const d = 0.01;
        const nah = await all('SELECT id, verein, ort, lat, lon FROM plaetze WHERE versteckt = 0 AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?',
          lat - d, lat + d, lon - d * 1.6, lon + d * 1.6);
        const gleich = nah.map((p) => ({ ...p, m: meters(lat, lon, p.lat, p.lon) })).filter((p) => p.m <= DOPPELT_METER).sort((a, b) => a.m - b.m)[0];
        // „Trotzdem anlegen“: z. B. zwei Vereine auf einem Sportgelände
        if (gleich && b.trotzdem !== true) return reply(409, { error: 'Diesen Platz gibt es wohl schon.', platz: { id: gleich.id, verein: gleich.verein, ort: gleich.ort } });

        const t = today();
        const heute = await one('SELECT COUNT(*) AS n FROM plaetze WHERE angelegt = ?', t);
        if (heute.n >= MAX_NEUE_PLAETZE_PRO_TAG) return reply(429, { error: 'Heute wurden schon sehr viele Plätze angelegt. Bitte morgen nochmal.' });

        const id = newId();
        await run('INSERT INTO plaetze (id, verein, ort, lat, lon, angelegt) VALUES (?, ?, ?, ?, ?, ?)', id, verein, ort, lat, lon, t);
        return reply(201, { platz: { id, verein, ort, lat, lon, angelegt: t } });
      }

      return reply(404, { error: 'Unbekannte Adresse' });
    } catch (ex) {
      console.error(ex);
      return reply(500, { error: 'Da ist auf dem Server etwas schiefgelaufen.' });
    }
  },
};

// ---------- Hilfen ----------
// Text säubern: keine Steuerzeichen, Leerraum zusammenfassen, Länge begrenzen
function clean(s, max) {
  return String(s ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}
function round4(x) {
  const n = Number(x);
  return Number.isFinite(n) ? Math.round(n * 1e4) / 1e4 : NaN;
}
function meters(a1, o1, a2, o2) {
  const R = 6371000; const r = Math.PI / 180;
  const x = (o2 - o1) * r * Math.cos(((a1 + a2) / 2) * r);
  const y = (a2 - a1) * r;
  return Math.round(Math.hypot(x, y) * R);
}
// Heutiges Datum in deutscher Zeit
function today() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
}
function newId() {
  const abc = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => abc[b % abc.length]).join('');
}
