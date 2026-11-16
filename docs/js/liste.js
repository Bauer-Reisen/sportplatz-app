// Seite „Liste“: alle Plätze, Suche und „Wo bin ich?“.
import { HIER_METER } from './config.js?v=0.4.0';
import { getPlaetze, cache } from './api.js?v=0.4.0';
import { locate, pos, posFrisch, meters, fmtDist } from './geo.js?v=0.4.0';
import { esc, zahl } from './ui.js?v=0.4.0';
import { platzSuche } from './suche.js?v=0.4.0';
import { vorschlaege, offen, vorschlagLink } from './vorschlaege.js?v=0.4.0';
import { anzahl } from './besuche.js?v=0.4.0';
import { installBanner, wireInstall } from './install.js?v=0.4.0';

let suche = ''; // bleibt beim Seitenwechsel erhalten

export async function render(view) {
  view.innerHTML = `
    <section>
      ${installBanner()}
      <h1>Plätze</h1>
      <button type="button" class="btn btn-primary btn-wide btn-big" id="wo">📍 Wo bin ich?</button>
      <div id="hier" aria-live="polite"></div>
      <a class="meine-link" href="#/meine">🏟️ Meine Plätze <span class="zaehler">${anzahl()}</span></a>
      <label class="sr-only" for="suche">Verein oder Ort suchen</label>
      <input type="search" id="suche" class="search" placeholder="🔍 Verein oder Ort suchen" value="${esc(suche)}" autocomplete="off" enterkeyhint="search">
      <p class="muted small" id="status"></p>
      <ul class="plist" id="liste"><li class="muted">Lade Plätze …</li></ul>
      <a class="btn btn-wide" href="#/neu" style="margin-top:12px">➕ Platz fehlt – hier anlegen</a>
    </section>`;
  wireInstall(view);

  const $ = (s) => view.querySelector(s);
  let plaetze = [];
  let liste = []; // Vereinsliste (OpenStreetMap)

  const zeichnen = () => {
    const q = suche.trim().toLowerCase();
    let rows = plaetze.map((p) => ({ ...p, m: posFrisch() ? meters(pos.lat, pos.lon, p.lat, p.lon) : null }));
    if (q) rows = platzSuche(rows, q);
    else if (posFrisch()) rows.sort((a, b) => a.m - b.m);
    const neu = q ? platzSuche(offen(liste, plaetze), q).slice(0, 8) : [];
    $('#liste').innerHTML = (rows.length || neu.length)
      ? rows.map((p) => `
        <li><a href="#/platz/${esc(p.id)}">
          <span class="pname">${esc(p.verein)}</span>
          <span class="pmeta">${esc(p.ort)}${p.m != null ? ` · ${fmtDist(p.m)}` : ''}${p.schnitt != null ? ` · <span class="gold">★</span> ${zahl(p.schnitt)} (${p.n})` : p.n ? ` · ${p.n} ${p.n === 1 ? 'Bewertung' : 'Bewertungen'}` : ''}</span>
        </a></li>`).join('') + vorschlagHtml(neu)
      : q ? `<li class="nichtda"><p><strong>„${esc(suche.trim())}“ ist noch nicht in der App.</strong> Vielleicht hat ihn noch niemand angelegt.</p><a class="btn btn-primary btn-wide" href="#/neu/${encodeURIComponent(suche.trim())}">🗺️ Auf der Karte suchen und anlegen</a></li>` : '<li class="muted">Noch keine Plätze. Leg den ersten an, wenn du am Platz bist.</li>';
    $('#status').textContent = cache.offline ? 'Ohne Netz – das ist die zuletzt geladene Liste.' : `${plaetze.length} ${plaetze.length === 1 ? 'Platz' : 'Plätze'}`;
  };

  const hierZeigen = () => {
    if (!posFrisch()) return;
    const best = plaetze.map((p) => ({ ...p, m: meters(pos.lat, pos.lon, p.lat, p.lon) })).sort((a, b) => a.m - b.m)[0];
    const bekannt = naechster(offen(liste, plaetze));
    $('#hier').innerHTML = !(best && best.m <= HIER_METER) && bekannt
      ? hierBekannt(bekannt)
      : best && best.m <= HIER_METER
      ? `<a class="card here" href="#/platz/${esc(best.id)}">
           <span class="kicker">Du bist wohl hier</span>
           <span class="pname">${esc(best.verein)}</span>
           <span class="pmeta">${esc(best.ort)} · ${fmtDist(best.m)}</span>
         </a>`
      : `<div class="card here-none">
           <p><strong>Kein Platz in der Nähe gefunden.</strong>${best ? ` Der nächste ist ${fmtDist(best.m)} entfernt.` : ''}</p>
           <a class="btn btn-primary btn-wide" href="#/neu">➕ Diesen Platz anlegen</a>
         </div>`;
  };

  $('#suche').addEventListener('input', (e) => { suche = e.target.value; zeichnen(); });
  $('#wo').addEventListener('click', async () => {
    const btn = $('#wo');
    btn.disabled = true; btn.textContent = '📍 Suche deinen Standort …';
    try {
      await locate();
      suche = ''; $('#suche').value = '';
      hierZeigen(); zeichnen();
    } catch (ex) {
      $('#hier').innerHTML = `<div class="card here-none"><p>${esc(ex.message)}</p></div>`;
    } finally {
      btn.disabled = false; btn.textContent = '📍 Wo bin ich?';
    }
  });

  vorschlaege().then((l) => { liste = l; if (suche.trim()) zeichnen(); if (posFrisch()) hierZeigen(); });
  try {
    plaetze = await getPlaetze();
  } catch (ex) {
    $('#liste').innerHTML = `<li class="muted">${esc(ex.message)}</li>`;
    return;
  }
  hierZeigen();
  zeichnen();
}

// ---------- Bausteine für Vorschläge aus der Vereinsliste (auch in bewerten.js) ----------
export function vorschlagHtml(neu) {
  if (!neu.length) return '';
  return `<li class="vkopf">Noch nicht in der App – antippen zum Anlegen:</li>${neu.map((v) => `
    <li class="vorschlag"><a href="${vorschlagLink(v)}">
      <span class="pname">➕ ${esc(v.name)}</span>
      <span class="pmeta">${esc(v.ort)}${v.stadt ? ` · bei ${esc(v.stadt)}` : ''}${v.heim ? ' · Sportheim' : ''}</span>
    </a></li>`).join('')}`;
}
export function naechster(liste) {
  if (!posFrisch()) return null;
  const v = liste.map((x) => ({ ...x, m: meters(pos.lat, pos.lon, x.lat, x.lon) })).sort((a, b) => a.m - b.m)[0];
  return v && v.m <= HIER_METER ? v : null;
}
export function hierBekannt(v) {
  return `<div class="card here">
    <span class="kicker">Du bist wohl hier</span>
    <span class="pname">${esc(v.name)}</span>
    <span class="pmeta">${esc(v.ort)} · ${fmtDist(v.m)} · noch nicht in der App</span>
    <a class="btn btn-primary btn-wide" style="margin-top:10px" href="${vorschlagLink(v)}">➕ Mit einem Tipp anlegen</a>
  </div>`;
}
