// Cloudflare Worker „sportplatz“: die einzige Tür zur gemeinsamen Datenbank.
// - Nur die eigene Website darf ihn benutzen (ALLOWED_ORIGINS).
// - Jeder darf lesen, Plätze anlegen, bewerten und melden – ändern oder löschen nur die Verwaltung.
// - Verwaltung nur mit dem Verwaltungs-Code (Secret ADMIN_CODE im Cloudflare-Dashboard).
// - Alle Eingaben werden hier geprüft – was die App vorher prüft, ist nur Bequemlichkeit.
// - Gespeichert wird keine Geräte-Nummer und keine IP-Adresse; für „1 pro Tag“ und
//   „1 Meldung pro Handy“ nur ein Prüfwert, aus dem man das Handy nicht zurückrechnen kann.
// Hier im Code steht nichts Geheimes.

const MAX_NEUE_PLAETZE_PRO_TAG = 40;
const MAX_EINTRAEGE_PRO_TAG = 1500;    // alle zusammen – Bremse gegen Unsinn
const DOPPELT_METER = 150;
const MELDUNGEN_BIS_AUSBLENDEN = 3;
const LETZTE_ANGABEN = 5;              // je Sache zählen die letzten 5 Angaben
const VERALTET_TAGE = 365;
const MIN_BEWERTUNGEN = 3;             // darunter: Note zeigen, aber mit Hinweis „erst wenige Bewertungen“
const LAT = [47.0, 55.2];
const LON = [5.5, 15.5];

// Muss zu docs/js/angebot.js passen (prüft scripts/check-help.js)
const ANGEBOT = ['fassbier', 'alkoholfrei', 'softdrinks', 'kaffee', 'schnaps', 'kueche', 'bratwurst', 'currywurst', 'pommes', 'broetchen', 'kuchen', 'tv', 'karte'];
const KRITERIEN = ['gesamt', 'bier', 'essen', 'preise', 'stimmung'];
const GROESSEN = ['0,5', '0,33'];
const GRUENDE = ['stimmt nicht', 'beleidigend', 'werbung'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const cors = allowed.includes(origin)
      ? {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Admin',
          Vary: 'Origin',
        }
      : {};
    const reply = (status, body) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors },
      });

    if (url.pathname === '/api/health') return reply(200, { ok: true, verwaltung: Boolean(env.ADMIN_CODE) });
    if (!cors['Access-Control-Allow-Origin']) return reply(403, { error: 'Herkunft nicht erlaubt' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Max-Age': '86400' } });

    const db = env.DB;
    const all = async (sql, ...args) => (await db.prepare(sql).bind(...args).all()).results;
    const one = (sql, ...args) => db.prepare(sql).bind(...args).first();
    const run = (sql, ...args) => db.prepare(sql).bind(...args).run();
    const path = url.pathname;
    const method = request.method;
    const t = today();

    try {
      const isAdmin = path.startsWith('/api/admin');
      if ((method === 'POST' || isAdmin) && env.WRITE_LIMITER) {
        const ip = request.headers.get('CF-Connecting-IP') || 'lokal';
        const { success } = await env.WRITE_LIMITER.limit({ key: ip });
        if (!success) return reply(429, { error: 'Zu viele Anfragen. Bitte eine Minute warten.' });
      }

      // ================= Verwaltung =================
      if (isAdmin) {
        if (!env.ADMIN_CODE) return reply(503, { error: 'Der Verwaltungs-Code ist noch nicht eingerichtet (Cloudflare → Secret ADMIN_CODE).' });
        if (!(await sameText(normCode(request.headers.get('X-Admin')), normCode(env.ADMIN_CODE)))) return reply(401, { error: 'Der Verwaltungs-Code stimmt nicht.' });
        return await admin({ path, method, request, all, one, run, reply, t, db });
      }

      // Notbremse: Schreiben gesperrt?
      if (method === 'POST') {
        const s = await one("SELECT wert FROM einstellungen WHERE name = 'schreiben_erlaubt'");
        if (s && s.wert === '0') return reply(503, { error: 'Bewerten ist gerade pausiert. Bitte später nochmal.' });
      }

      // ---------- Alle Plätze mit Kurz-Note ----------
      if (path === '/api/plaetze' && method === 'GET') {
        const plaetze = await all(`
          SELECT p.id, p.verein, p.ort, p.lat, p.lon, p.angelegt,
            (SELECT COUNT(b.gesamt) FROM bewertungen b WHERE b.platz = p.id AND b.versteckt = 0) AS n,
            (SELECT AVG(b.gesamt) FROM bewertungen b WHERE b.platz = p.id AND b.versteckt = 0) AS schnitt,
            (SELECT MAX(b.tag) FROM bewertungen b WHERE b.platz = p.id AND b.versteckt = 0) AS zuletzt
          FROM plaetze p WHERE p.versteckt = 0 ORDER BY p.ort, p.verein`);
        for (const p of plaetze) {
          p.schnitt = p.n > 0 ? Math.round(p.schnitt * 10) / 10 : null;
        }
        return reply(200, { plaetze, heute: t, min: MIN_BEWERTUNGEN });
      }

      // ---------- Ein Platz mit Noten, Angebot, Bierpreis, letzten Einträgen ----------
      let m = /^\/api\/platz\/([a-z0-9]{6,20})$/.exec(path);
      if (m && method === 'GET') {
        const p = await one('SELECT id, verein, ort, lat, lon, angelegt FROM plaetze WHERE id = ? AND versteckt = 0', m[1]);
        if (!p) return reply(404, { error: 'Diesen Platz gibt es nicht (mehr).' });
        const rows = await all(`SELECT id, tag, besuch, art, gesamt, bier, essen, preise, stimmung, angebot, bierpreis, groesse
          FROM bewertungen WHERE platz = ? AND versteckt = 0 ORDER BY tag DESC, rowid DESC`, p.id);
        const ab = (await one('SELECT tag FROM angebot_ab WHERE platz = ?', p.id))?.tag || '';
        return reply(200, { platz: p, ...auswerten(rows, ab, t), heute: t });
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
          return reply(400, { error: 'Die Lage stimmt nicht. Bitte nochmal wählen.' });
        }
        const d = 0.01;
        const nah = await all('SELECT id, verein, ort, lat, lon FROM plaetze WHERE versteckt = 0 AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?',
          lat - d, lat + d, lon - d * 1.6, lon + d * 1.6);
        const gleich = nah.map((p) => ({ ...p, m: meters(lat, lon, p.lat, p.lon) })).filter((p) => p.m <= DOPPELT_METER).sort((a, b2) => a.m - b2.m)[0];
        // „Trotzdem anlegen“: z. B. zwei Vereine auf einem Sportgelände
        if (gleich && b.trotzdem !== true) return reply(409, { error: 'Diesen Platz gibt es wohl schon.', platz: { id: gleich.id, verein: gleich.verein, ort: gleich.ort } });

        const heute = await one('SELECT COUNT(*) AS n FROM plaetze WHERE angelegt = ?', t);
        if (heute.n >= MAX_NEUE_PLAETZE_PRO_TAG) return reply(429, { error: 'Heute wurden schon sehr viele Plätze angelegt. Bitte morgen nochmal.' });

        const id = newId();
        await run('INSERT INTO plaetze (id, verein, ort, lat, lon, angelegt) VALUES (?, ?, ?, ?, ?, ?)', id, verein, ort, lat, lon, t);
        return reply(201, { platz: { id, verein, ort, lat, lon, angelegt: t, n: 0, schnitt: null, zuletzt: null } });
      }

      // ---------- Bewertung oder „Nur Angebot“ ----------
      if (path === '/api/bewertungen' && method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const id = String(b.id || '');
        if (!/^[a-z0-9-]{8,40}$/.test(id)) return reply(400, { error: 'Ungültige Kennung.' });
        const geraet = String(b.geraet || '');
        if (!/^[a-z0-9-]{8,40}$/.test(geraet)) return reply(400, { error: 'Ungültiges Gerät.' });
        const p = await one('SELECT id FROM plaetze WHERE id = ? AND versteckt = 0', String(b.platz || ''));
        if (!p) return reply(404, { error: 'Diesen Platz gibt es nicht (mehr).' });

        // Schon da? (z. B. zweimal gesendet, weil das Netz weg war) → einfach „ok“
        if (await one('SELECT id FROM bewertungen WHERE id = ?', id)) return reply(200, { ok: true, schon: true });

        const art = b.art === 'angebot' ? 'angebot' : 'bewertung';
        // 'kuerzlich' = in den letzten 3 Monaten, 'laenger' = länger her ('heute' gibt es aus alten Versionen)
        const besuch = ['heute', 'kuerzlich', 'laenger'].includes(b.besuch) ? b.besuch : 'kuerzlich';
        const sterne = {};
        for (const k of KRITERIEN) {
          const v = b[k];
          if (v === null || v === undefined || v === '' || art === 'angebot') { sterne[k] = null; continue; }
          // Schieberegler: auch Teil-Sterne, z. B. 3,7 (auf Zehntel gerundet)
          if (typeof v !== 'number' || !Number.isFinite(v) || v < 0.5 || v > 5) return reply(400, { error: 'Sterne bitte zwischen 0,5 und 5.' });
          sterne[k] = Math.round(v * 10) / 10;
        }
        if (art === 'bewertung' && sterne.gesamt == null) return reply(400, { error: 'Bitte mindestens die Gesamt-Sterne vergeben.' });

        const angebot = {};
        if (b.angebot && typeof b.angebot === 'object') {
          for (const [k, v] of Object.entries(b.angebot)) {
            if (!ANGEBOT.includes(k)) continue;
            if (v === 1 || v === 0) angebot[k] = v;
          }
        }
        let bierpreis = null;
        let groesse = null;
        if (b.bierpreis !== null && b.bierpreis !== undefined && b.bierpreis !== '') {
          const n = Number(b.bierpreis);
          if (!Number.isFinite(n) || n < 0.5 || n > 15) return reply(400, { error: 'Der Bierpreis sieht nicht richtig aus (0,50 bis 15 €).' });
          bierpreis = Math.round(n * 100) / 100;
          groesse = GROESSEN.includes(b.groesse) ? b.groesse : '0,5';
        }
        if (art === 'angebot' && !Object.keys(angebot).length && bierpreis == null) {
          return reply(400, { error: 'Bitte mindestens eine Angabe zum Angebot machen.' });
        }

        const gesamt = await one('SELECT COUNT(*) AS n FROM bewertungen WHERE tag = ?', t);
        if (gesamt.n >= MAX_EINTRAEGE_PRO_TAG) return reply(429, { error: 'Heute gab es schon sehr viele Einträge. Bitte morgen nochmal.' });

        const schluessel = await sha(`${geraet}|${p.id}|${t}`);
        try {
          await db.batch([
            db.prepare('INSERT INTO sperren (schluessel, tag) VALUES (?, ?)').bind(schluessel, t),
            db.prepare(`INSERT INTO bewertungen (id, platz, tag, besuch, art, gesamt, bier, essen, preise, stimmung, angebot, bierpreis, groesse)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .bind(id, p.id, t, besuch, art, sterne.gesamt, sterne.bier, sterne.essen, sterne.preise, sterne.stimmung, JSON.stringify(angebot), bierpreis, groesse),
          ]);
        } catch (ex) {
          if (/UNIQUE|constraint/i.test(String(ex))) return reply(409, { error: 'Diesen Platz hast du heute schon bewertet. Morgen wieder!' });
          throw ex;
        }
        return reply(201, { ok: true });
      }

      // ---------- Melden ----------
      if (path === '/api/melden' && method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const geraet = String(b.geraet || '');
        if (!/^[a-z0-9-]{8,40}$/.test(geraet)) return reply(400, { error: 'Ungültiges Gerät.' });
        const grund = GRUENDE.includes(b.grund) ? b.grund : null;
        if (!grund) return reply(400, { error: 'Bitte einen Grund wählen.' });
        const bw = await one('SELECT id FROM bewertungen WHERE id = ?', String(b.bewertung || ''));
        if (!bw) return reply(404, { error: 'Diesen Eintrag gibt es nicht mehr.' });
        const schluessel = await sha(`${geraet}|melden`);
        const r = await run('INSERT OR IGNORE INTO meldungen (bewertung, schluessel, grund, tag) VALUES (?, ?, ?, ?)', bw.id, schluessel, grund, t);
        if (r.meta.changes) {
          await run(`UPDATE bewertungen SET meldungen = (SELECT COUNT(*) FROM meldungen WHERE bewertung = ?),
                       versteckt = CASE WHEN (SELECT COUNT(*) FROM meldungen WHERE bewertung = ?) >= ? THEN 1 ELSE versteckt END
                     WHERE id = ?`, bw.id, bw.id, MELDUNGEN_BIS_AUSBLENDEN, bw.id);
        }
        return reply(200, { ok: true });
      }

      return reply(404, { error: 'Unbekannte Adresse' });
    } catch (ex) {
      console.error(ex);
      return reply(500, { error: 'Da ist auf dem Server etwas schiefgelaufen.' });
    }
  },
};

// ================= Verwaltung =================
async function admin({ path, method, request, all, one, run, reply, t, db }) {
  // Überblick: gemeldete/ausgeblendete Einträge, ausgeblendete Plätze, Notbremse
  if (path === '/api/admin' && method === 'GET') {
    const eintraege = await all(`
      SELECT b.id, b.platz, p.verein, p.ort, b.tag, b.art, b.gesamt, b.angebot, b.bierpreis, b.groesse, b.versteckt, b.meldungen,
        (SELECT GROUP_CONCAT(DISTINCT m.grund) FROM meldungen m WHERE m.bewertung = b.id) AS gruende
      FROM bewertungen b LEFT JOIN plaetze p ON p.id = b.platz
      WHERE b.meldungen > 0 OR b.versteckt = 1 ORDER BY b.versteckt DESC, b.meldungen DESC, b.tag DESC LIMIT 200`);
    const plaetze = await all(`SELECT id, verein, ort, angelegt, versteckt,
      (SELECT COUNT(*) FROM bewertungen b WHERE b.platz = plaetze.id) AS eintraege FROM plaetze ORDER BY versteckt DESC, ort, verein`);
    const s = await one("SELECT wert FROM einstellungen WHERE name = 'schreiben_erlaubt'");
    return reply(200, { eintraege, plaetze, schreibenErlaubt: !s || s.wert !== '0', heute: t });
  }

  let m = /^\/api\/admin\/bewertung\/([a-z0-9-]{8,40})$/.exec(path);
  if (m && method === 'POST') {
    const { aktion } = await request.json().catch(() => ({}));
    if (aktion === 'zeigen') {
      // wieder zeigen und die bisherigen Meldungen vergessen (sonst wäre sie gleich wieder weg)
      await db.batch([
        db.prepare('DELETE FROM meldungen WHERE bewertung = ?').bind(m[1]),
        db.prepare('UPDATE bewertungen SET versteckt = 0, meldungen = 0 WHERE id = ?').bind(m[1]),
      ]);
    } else if (aktion === 'ausblenden') {
      await run('UPDATE bewertungen SET versteckt = 1 WHERE id = ?', m[1]);
    } else if (aktion === 'entfernen') {
      await db.batch([
        db.prepare('DELETE FROM meldungen WHERE bewertung = ?').bind(m[1]),
        db.prepare('DELETE FROM bewertungen WHERE id = ?').bind(m[1]),
      ]);
    } else return reply(400, { error: 'Unbekannte Aktion' });
    return reply(200, { ok: true });
  }

  m = /^\/api\/admin\/platz\/([a-z0-9]{6,20})$/.exec(path);
  if (m && method === 'POST') {
    const { aktion } = await request.json().catch(() => ({}));
    if (aktion === 'ausblenden') await run('UPDATE plaetze SET versteckt = 1 WHERE id = ?', m[1]);
    else if (aktion === 'zeigen') await run('UPDATE plaetze SET versteckt = 0 WHERE id = ?', m[1]);
    else if (aktion === 'angebot_zuruecksetzen') await run('INSERT INTO angebot_ab (platz, tag) VALUES (?, ?) ON CONFLICT(platz) DO UPDATE SET tag = excluded.tag', m[1], t);
    else return reply(400, { error: 'Unbekannte Aktion' });
    return reply(200, { ok: true });
  }

  if (path === '/api/admin/schreiben' && method === 'POST') {
    const { erlaubt } = await request.json().catch(() => ({}));
    await run("INSERT INTO einstellungen (name, wert) VALUES ('schreiben_erlaubt', ?) ON CONFLICT(name) DO UPDATE SET wert = excluded.wert", erlaubt ? '1' : '0');
    return reply(200, { ok: true, schreibenErlaubt: !!erlaubt });
  }

  // Sicherung: alles (ohne Sperren und Prüfwerte) als eine Datei
  if (path === '/api/admin/sicherung' && method === 'GET') {
    return reply(200, {
      erstellt: new Date().toISOString(),
      plaetze: await all('SELECT * FROM plaetze'),
      bewertungen: await all('SELECT * FROM bewertungen'),
      meldungen: await all('SELECT bewertung, grund, tag FROM meldungen'),
      angebot_ab: await all('SELECT * FROM angebot_ab'),
      einstellungen: await all('SELECT * FROM einstellungen'),
    });
  }

  return reply(404, { error: 'Unbekannte Adresse' });
}

// ================= Auswertung eines Platzes =================
// Sterne: Durchschnitt aller sichtbaren Bewertungen, schon ab der ersten (die App weist auf „erst wenige“ hin).
// Angebot: je Sache die letzten 5 Angaben → ja / nein / unklar; „veraltet“, wenn die neueste über ein Jahr alt ist.
// Bierpreis: mittlerer Wert (Median) der letzten 5 Angaben je Größe.
function auswerten(rows, angebotAb, heute) {
  const noten = {};
  for (const k of KRITERIEN) {
    const werte = rows.filter((r) => r[k] != null);
    const n = werte.length;
    noten[k] = {
      n,
      schnitt: n > 0 ? Math.round((werte.reduce((s, r) => s + r[k], 0) / n) * 10) / 10 : null,
      zuletzt: werte[0]?.tag || null,
      veraltet: n > 0 && alterTage(werte[0].tag, heute) > VERALTET_TAGE,
    };
  }

  const angebot = {};
  for (const k of ANGEBOT) {
    const angaben = [];
    for (const r of rows) {
      if (angebotAb && r.tag < angebotAb) continue;
      let a; try { a = JSON.parse(r.angebot || '{}'); } catch { a = {}; }
      if (a[k] === 1 || a[k] === 0) angaben.push({ v: a[k], tag: r.tag });
      if (angaben.length >= LETZTE_ANGABEN) break;
    }
    if (!angaben.length) { angebot[k] = { status: 'unbekannt' }; continue; }
    const ja = angaben.filter((x) => x.v === 1).length;
    const anteil = ja / angaben.length;
    angebot[k] = {
      status: anteil >= 0.75 ? 'ja' : anteil <= 0.25 ? 'nein' : 'unklar',
      ja, nein: angaben.length - ja,
      stand: angaben[0].tag,
      veraltet: alterTage(angaben[0].tag, heute) > VERALTET_TAGE,
    };
  }

  const bierpreis = {};
  for (const g of GROESSEN) {
    const preise = rows.filter((r) => r.bierpreis != null && r.groesse === g).slice(0, LETZTE_ANGABEN);
    if (!preise.length) continue;
    const sortiert = preise.map((r) => r.bierpreis).sort((a, b) => a - b);
    const mitte = Math.floor(sortiert.length / 2);
    const median = sortiert.length % 2 ? sortiert[mitte] : (sortiert[mitte - 1] + sortiert[mitte]) / 2;
    bierpreis[g] = {
      preis: Math.round(median * 100) / 100, n: preise.length, stand: preise[0].tag,
      veraltet: alterTage(preise[0].tag, heute) > VERALTET_TAGE,
    };
  }

  const eintraege = rows.slice(0, 30).map((r) => ({
    id: r.id, tag: r.tag, besuch: r.besuch, art: r.art, gesamt: r.gesamt,
    bier: r.bier, essen: r.essen, preise: r.preise, stimmung: r.stimmung,
  }));
  return { noten, angebot, bierpreis, eintraege, min: MIN_BEWERTUNGEN };
}

// ================= Hilfen =================
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
function today() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
}
function alterTage(tag, heute) {
  return Math.round((Date.parse(heute) - Date.parse(tag)) / 86_400_000);
}
function newId() {
  const abc = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => abc[b % abc.length]).join('');
}
async function sha(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`halbzeit|${text}`));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}
const normCode = (s) => String(s || '').trim().toLowerCase();
// Vergleich ohne Zeitunterschiede (gegen Raten über die Antwortzeit)
async function sameText(a, b) {
  if (!a || !b) return false;
  const [x, y] = await Promise.all([sha(a), sha(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}
