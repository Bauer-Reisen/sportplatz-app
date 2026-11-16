// Seite „Liste“: alle Plätze, Suche und „Wo bin ich?“.
import { HIER_METER } from './config.js?v=0.3.0';
import { getPlaetze, cache } from './api.js?v=0.3.0';
import { locate, pos, posFrisch, meters, fmtDist } from './geo.js?v=0.3.0';
import { esc, zahl } from './ui.js?v=0.3.0';
import { installBanner, wireInstall } from './install.js?v=0.3.0';

let suche = ''; // bleibt beim Seitenwechsel erhalten

export async function render(view) {
  view.innerHTML = `
    <section>
      ${installBanner()}
      <h1>Plätze</h1>
      <button type="button" class="btn btn-primary btn-wide btn-big" id="wo">📍 Wo bin ich?</button>
      <div id="hier" aria-live="polite"></div>
      <label class="sr-only" for="suche">Verein oder Ort suchen</label>
      <input type="search" id="suche" class="search" placeholder="🔍 Verein oder Ort suchen" value="${esc(suche)}" autocomplete="off" enterkeyhint="search">
      <p class="muted small" id="status"></p>
      <ul class="plist" id="liste"><li class="muted">Lade Plätze …</li></ul>
      <a class="btn btn-wide" href="#/neu" style="margin-top:12px">➕ Platz fehlt – hier anlegen</a>
    </section>`;
  wireInstall(view);

  const $ = (s) => view.querySelector(s);
  let plaetze = [];

  const zeichnen = () => {
    const q = suche.trim().toLowerCase();
    let rows = plaetze.map((p) => ({ ...p, m: posFrisch() ? meters(pos.lat, pos.lon, p.lat, p.lon) : null }));
    if (q) rows = rows.filter((p) => `${p.verein} ${p.ort}`.toLowerCase().includes(q));
    if (posFrisch()) rows.sort((a, b) => a.m - b.m);
    $('#liste').innerHTML = rows.length
      ? rows.map((p) => `
        <li><a href="#/platz/${esc(p.id)}">
          <span class="pname">${esc(p.verein)}</span>
          <span class="pmeta">${esc(p.ort)}${p.m != null ? ` · ${fmtDist(p.m)}` : ''}${p.schnitt != null ? ` · <span class="gold">★</span> ${zahl(p.schnitt)} (${p.n})` : p.n ? ` · ${p.n} ${p.n === 1 ? 'Bewertung' : 'Bewertungen'}` : ''}</span>
        </a></li>`).join('')
      : `<li class="muted">${q ? 'Nichts gefunden. Fehlt der Platz? Dann leg ihn unten an.' : 'Noch keine Plätze. Leg den ersten an, wenn du am Platz bist.'}</li>`;
    $('#status').textContent = cache.offline ? 'Ohne Netz – das ist die zuletzt geladene Liste.' : `${plaetze.length} ${plaetze.length === 1 ? 'Platz' : 'Plätze'}`;
  };

  const hierZeigen = () => {
    if (!posFrisch()) return;
    const best = plaetze.map((p) => ({ ...p, m: meters(pos.lat, pos.lon, p.lat, p.lon) })).sort((a, b) => a.m - b.m)[0];
    $('#hier').innerHTML = best && best.m <= HIER_METER
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

  try {
    plaetze = await getPlaetze();
  } catch (ex) {
    $('#liste').innerHTML = `<li class="muted">${esc(ex.message)}</li>`;
    return;
  }
  hierZeigen();
  zeichnen();
}
