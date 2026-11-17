// Seite „Bewerten“.
//   #/bewerten               → Platz wählen („Wo bin ich?“ oder Suche)
//   #/bewerten/<id>          → Sterne (+ freiwillig: Einzelnoten, Angebot, Bierpreis)
//   #/bewerten/<id>/angebot  → nur Angebot eintragen, ohne Sterne (z. B. als Betreiber)
// Gesendet wird über die Warteschlange (senden.js): klappt auch ohne Netz, 10 Sekunden „Rückgängig“.
import { HIER_METER } from './config.js?v=0.4.3';
import { schnellPlaetze, findPlatz, getPlatz, gespeicherterPlatz } from './api.js?v=0.4.3';
import { locate, pos, posFrisch, meters, fmtDist } from './geo.js?v=0.4.3';
import { ANGEBOT } from './angebot.js?v=0.4.3';
import { einreihen, zuruecknehmen, heuteBewertet, neueId, WARTEN_MS, heute } from './senden.js?v=0.4.3';
import { esc, toast, undoBar, zahl } from './ui.js?v=0.4.3';
import { merken, vergessen, warDa } from './besuche.js?v=0.4.3';
import { platzSuche } from './suche.js?v=0.4.3';
import { vorschlaege, offen } from './vorschlaege.js?v=0.4.3';
import { vorschlagHtml, naechster, hierBekannt } from './liste.js?v=0.4.3';

const wort = (v) => (v < 1.5 ? 'Lieber nicht' : v < 2.5 ? 'Geht so' : v < 3.5 ? 'Ordentlich' : v < 4.5 ? 'Gut' : 'Top!');
const EINZELN = [
  { k: 'bier', t: '🍺 Bier' },
  { k: 'essen', t: '🌭 Essen' },
  { k: 'preise', t: '💶 Preise' },
  { k: 'stimmung', t: '🎉 Stimmung' },
];

export async function render(view, id, modus) {
  if (!id) return waehlen(view);
  return formular(view, id, modus === 'angebot');
}

// ---------- Platz wählen ----------
async function waehlen(view) {
  view.innerHTML = `
    <section>
      <h1>Bewerten</h1>
      <p class="lead">Welchen Platz bewertest du?</p>
      <button type="button" class="btn btn-primary btn-wide btn-big" id="wo">📍 Wo bin ich?</button>
      <div id="hier" aria-live="polite"></div>
      <label class="sr-only" for="suche">Verein oder Ort suchen</label>
      <input type="search" id="suche" class="search" placeholder="🔍 Oder Verein / Ort suchen" autocomplete="off" enterkeyhint="search">
      <ul class="plist" id="liste"></ul>
    </section>`;
  const $ = (s) => view.querySelector(s);
  let plaetze = [];
  let liste = [];
  vorschlaege().then((l) => { liste = l; });
  try { plaetze = await schnellPlaetze(); } catch (ex) { $('#liste').innerHTML = `<li class="muted">${esc(ex.message)}</li>`; }

  const zeichnen = () => {
    const q = $('#suche').value.trim();
    if (!q) { $('#liste').innerHTML = ''; return; }
    const rows = platzSuche(plaetze, q).slice(0, 30);
    const neu = platzSuche(offen(liste, plaetze), q).slice(0, 8);
    $('#liste').innerHTML = rows.length || neu.length
      ? rows.map((p) => `<li><a href="#/bewerten/${esc(p.id)}"><span class="pname">${esc(p.verein)}</span><span class="pmeta">${esc(p.ort)}</span></a></li>`).join('') + vorschlagHtml(neu)
      : `<li class="nichtda"><p><strong>„${esc(q)}“ ist noch nicht in der App.</strong> Vielleicht hat ihn noch niemand angelegt.</p><a class="btn btn-primary btn-wide" href="#/neu/${encodeURIComponent(q)}">🗺️ Auf der Karte suchen und anlegen</a></li>`;
  };
  const hierZeigen = () => {
    const best = plaetze.map((p) => ({ ...p, m: meters(pos.lat, pos.lon, p.lat, p.lon) })).sort((a, b) => a.m - b.m)[0];
    const bekannt = naechster(offen(liste, plaetze));
    $('#hier').innerHTML = !(best && best.m <= HIER_METER) && bekannt
      ? hierBekannt(bekannt)
      : best && best.m <= HIER_METER
      ? `<a class="card here" href="#/bewerten/${esc(best.id)}">
           <span class="kicker">Du bist wohl hier – antippen</span>
           <span class="pname">${esc(best.verein)}</span>
           <span class="pmeta">${esc(best.ort)} · ${fmtDist(best.m)}</span>
         </a>`
      : `<div class="card here-none">
           <p><strong>Kein Platz in der Nähe gefunden.</strong> Leg ihn zuerst an – dauert eine halbe Minute.</p>
           <a class="btn btn-primary btn-wide" href="#/neu">➕ Platz anlegen</a>
         </div>`;
  };
  $('#suche').addEventListener('input', zeichnen);
  $('#wo').addEventListener('click', async () => {
    const btn = $('#wo');
    btn.disabled = true; btn.textContent = '📍 Suche deinen Standort …';
    try { await locate(); hierZeigen(); } catch (ex) { $('#hier').innerHTML = `<div class="card here-none"><p>${esc(ex.message)}</p></div>`; }
    finally { btn.disabled = false; btn.textContent = '📍 Wo bin ich?'; }
  });
  if (posFrisch() && plaetze.length) hierZeigen();
}

// ---------- Bewerten / Angebot eintragen ----------
async function formular(view, id, nurAngebot) {
  let p = findPlatz(id);
  let daten = null;
  // Schon mal gesehen? Dann sofort los, ohne aufs Netz zu warten.
  const vorher = gespeicherterPlatz(id);
  if (vorher) { daten = vorher; p = vorher.platz; getPlatz(id).catch(() => {}); }
  else {
    view.innerHTML = '<p class="loading">Lade …</p>';
    try { daten = await getPlatz(id); p = daten.platz; } catch (ex) { if (ex.status === 404) p = null; }
    if (!view.isConnected) return;
  }
  if (!p) {
    view.innerHTML = `<section><h1>Platz nicht gefunden</h1><p class="lead">Vielleicht wurde er ausgeblendet – oder gerade ist kein Netz.</p><a class="btn btn-wide" href="#/bewerten">Anderen Platz wählen</a></section>`;
    return;
  }

  const kopf = `
    <a class="back" href="#/platz/${esc(p.id)}">‹ ${esc(p.verein)}</a>
    <h1>${nurAngebot ? 'Angebot eintragen' : 'Bewerten'}</h1>
    <p class="lead">${esc(p.verein)} · ${esc(p.ort)}</p>`;

  if (heuteBewertet(p.id)) {
    view.innerHTML = `<section>${kopf}
      <div class="card card-soft"><p>✅ <strong>Du hast hier heute schon etwas eingetragen.</strong> Pro Platz geht ein Eintrag am Tag – morgen wieder!</p></div>
      <a class="btn btn-wide" href="#/platz/${esc(p.id)}">Zum Platz</a></section>`;
    return;
  }

  // Vorbelegen mit dem, was andere angegeben haben
  const bekannt = {};
  for (const a of ANGEBOT) {
    const s = daten?.angebot?.[a.k]?.status;
    if (s === 'ja') bekannt[a.k] = 1;
    else if (s === 'nein') bekannt[a.k] = 0;
  }
  const vorOrt = posFrisch() && meters(pos.lat, pos.lon, p.lat, p.lon) < 1000;

  const angebotTeil = `
    <p class="label">Was gibt es hier?</p>
    <p class="small muted">Antippen: <span class="pill ja">✓ gibt es</span> → <span class="pill nein">✗ gibt es nicht</span> → leer.${Object.keys(bekannt).length ? ' Vorausgefüllt mit den bisherigen Angaben – bitte nur ändern, was nicht stimmt.' : ''}</p>
    <div class="kacheln">
      ${ANGEBOT.map((a) => `<button type="button" class="kachel" data-k="${a.k}" aria-pressed="false"><span class="ke" aria-hidden="true">${a.e}</span><span class="kt">${esc(a.t)}</span><span class="kz" aria-hidden="true"></span></button>`).join('')}
    </div>
    <label for="preis">Was kostet ein Bier?</label>
    <div class="preiszeile">
      <input id="preis" type="text" inputmode="decimal" placeholder="z. B. 3,50" maxlength="6" autocomplete="off"><span class="euro">€</span>
      <div class="seg seg-klein" role="group" aria-label="Größe">
        <button type="button" class="btn on" data-g="0,5">0,5 l</button>
        <button type="button" class="btn" data-g="0,33">0,33 l</button>
      </div>
    </div>`;

  view.innerHTML = `
    <section>
      ${kopf}
      <form class="form" id="bew" novalidate>
        ${nurAngebot ? `<div class="card">${angebotTeil}</div>` : `
        <p class="label">Wann warst du da?</p>
        <div class="seg" role="group" aria-label="Wann warst du da?">
          <button type="button" class="btn on" data-b="kuerzlich">In den letzten 3 Monaten</button>
          <button type="button" class="btn" data-b="laenger">Länger her</button>
        </div>
        <p class="label">Wie war's insgesamt?</p>
        ${sterne('gesamt', 'Gesamt', true)}
        <p class="sternwort" id="wort" aria-live="polite">Tippen oder mit dem Finger ziehen</p>
        <details class="card mehr" id="mehr">
          <summary>Mehr angeben <span class="muted">(freiwillig)</span></summary>
          ${EINZELN.map((e) => `<div class="einzel"><span>${e.t}</span>${sterne(e.k, e.t.replace(/^\S+ /, ''), false)}</div>`).join('')}
          <hr>
          ${angebotTeil}
        </details>`}
        <p class="error" role="alert"></p>
        <div class="sendeleiste"><button class="btn btn-primary btn-wide btn-big" type="submit">Senden</button></div>
      </form>
      <p class="center">${nurAngebot
        ? `<a class="link" href="#/bewerten/${esc(p.id)}">Lieber mit Sternen bewerten</a>`
        : `<a class="link" href="#/bewerten/${esc(p.id)}/angebot">Nur Angebot eintragen (ohne Sterne)</a>`}</p>
      <p class="muted small center">Keine Namen, kein Konto. Pro Platz ein Eintrag am Tag.</p>
    </section>`;

  const $ = (s) => view.querySelector(s);
  const werte = {};
  const angebot = { ...bekannt };
  let besuch = 'kuerzlich';
  let groesse = '0,5';

  // Sterne als Schieberegler: tippen oder ziehen, auch Teil-Sterne (z. B. 3,7)
  view.querySelectorAll('.regler').forEach((r) => {
    const k = r.dataset.k;
    const flaeche = r.querySelector('.regler-sterne');
    const setzen = (v) => {
      werte[k] = v;
      r.querySelector('.voll').style.width = `${v == null ? 0 : (v / 5) * 100}%`;
      r.querySelector('.regler-zahl').textContent = v == null ? '' : zahl(v);
      r.setAttribute('aria-valuenow', String(v ?? 0));
      r.setAttribute('aria-valuetext', v == null ? 'keine Angabe' : `${zahl(v)} von 5 Sternen`);
      const weg = r.querySelector('.regler-weg');
      if (weg) weg.hidden = v == null;
      if (k === 'gesamt' && v != null) { $('#wort').textContent = wort(v); $('.error').textContent = ''; }
    };
    const ausPunkt = (x) => {
      const box = flaeche.getBoundingClientRect();
      const v = Math.round(((x - box.left) / box.width) * 50) / 10;
      return Math.min(5, Math.max(0.5, v));
    };
    let zieht = false;
    let letzte = null;
    flaeche.addEventListener('pointerdown', (e) => {
      zieht = true;
      try { flaeche.setPointerCapture(e.pointerId); } catch { /* egal */ }
      setzen(ausPunkt(e.clientX));
      letzte = Math.round(werte[k]);
    });
    flaeche.addEventListener('pointermove', (e) => {
      if (!zieht) return;
      setzen(ausPunkt(e.clientX));
      // kurzes Ruckeln bei jedem vollen Stern
      if (Math.round(werte[k]) !== letzte) { letzte = Math.round(werte[k]); if (navigator.vibrate) navigator.vibrate(8); }
    });
    const ende = () => { zieht = false; };
    flaeche.addEventListener('pointerup', ende);
    flaeche.addEventListener('pointercancel', ende);
    r.addEventListener('keydown', (e) => {
      const schritt = e.shiftKey ? 0.5 : 0.1;
      const alt = werte[k] ?? 0;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setzen(Math.min(5, Math.round((alt + schritt) * 10) / 10 || 0.5)); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setzen(Math.max(0.5, Math.round((alt - schritt) * 10) / 10)); }
    });
    r.querySelector('.regler-weg')?.addEventListener('click', () => setzen(null));
  });
  // Wann
  view.querySelectorAll('[data-b]').forEach((b) => b.addEventListener('click', () => {
    besuch = b.dataset.b;
    view.querySelectorAll('[data-b]').forEach((x) => x.classList.toggle('on', x === b));
  }));
  // Angebot-Kacheln: leer → ✓ → ✗ → leer
  const kachelZeigen = (el) => {
    const v = angebot[el.dataset.k];
    el.classList.toggle('ja', v === 1);
    el.classList.toggle('nein', v === 0);
    el.querySelector('.kz').textContent = v === 1 ? '✓' : v === 0 ? '✗' : '';
    el.setAttribute('aria-pressed', v === 1 ? 'true' : v === 0 ? 'mixed' : 'false');
    el.setAttribute('aria-label', `${el.querySelector('.kt').textContent}: ${v === 1 ? 'gibt es' : v === 0 ? 'gibt es nicht' : 'keine Angabe'}`);
  };
  view.querySelectorAll('.kachel').forEach((el) => {
    kachelZeigen(el);
    el.addEventListener('click', () => {
      const k = el.dataset.k;
      angebot[k] = angebot[k] === undefined ? 1 : angebot[k] === 1 ? 0 : undefined;
      if (angebot[k] === undefined) delete angebot[k];
      kachelZeigen(el);
      $('.error').textContent = '';
    });
  });
  view.querySelectorAll('[data-g]').forEach((b) => b.addEventListener('click', () => {
    groesse = b.dataset.g;
    view.querySelectorAll('[data-g]').forEach((x) => x.classList.toggle('on', x === b));
  }));

  $('#bew').addEventListener('submit', (e) => {
    e.preventDefault();
    const err = $('.error');
    err.textContent = '';
    const mitAngebot = nurAngebot || $('#mehr')?.open;
    let bierpreis = null;
    const roh = mitAngebot ? $('#preis').value.replace(/€/g, '').replace(',', '.').trim() : '';
    if (roh) {
      bierpreis = Number(roh);
      if (!Number.isFinite(bierpreis) || bierpreis < 0.5 || bierpreis > 15) { err.textContent = 'Der Bierpreis sieht nicht richtig aus – z. B. 3,50.'; return; }
    }
    if (!nurAngebot && !werte.gesamt) { err.textContent = 'Bitte zuerst die Gesamt-Sterne setzen.'; return; }
    if (nurAngebot && !Object.keys(angebot).length && bierpreis == null) { err.textContent = 'Bitte mindestens eine Kachel antippen oder den Bierpreis eintragen.'; return; }

    const body = {
      id: neueId(), platz: p.id,
      art: nurAngebot ? 'angebot' : 'bewertung',
      besuch: nurAngebot ? 'kuerzlich' : besuch,
      ...(nurAngebot ? {} : { gesamt: werte.gesamt, bier: werte.bier ?? null, essen: werte.essen ?? null, preise: werte.preise ?? null, stimmung: werte.stimmung ?? null }),
      angebot: mitAngebot ? angebot : {},
      bierpreis, groesse: bierpreis == null ? null : groesse,
    };
    einreihen(body);
    // Besuch ins Stempelheft – mit Datum nur, wenn du gerade dort bist
    const tag = vorOrt ? heute() : '';
    const vorher = warDa(p.id);
    const ziel = body.art === 'bewertung' ? merken(p, tag) : 0;
    if (navigator.vibrate) navigator.vibrate(30);
    location.hash = `#/platz/${p.id}`;
    undoBar((ziel > 1 ? `🏆 Dein ${ziel}. Platz! ` : 'Danke! ') + (navigator.onLine ? 'Wird gleich gesendet …' : 'Wird gesendet, sobald Netz da ist.'), WARTEN_MS, () => {
      if (zuruecknehmen(body.id)) { toast('Zurückgenommen – nichts gesendet.'); if (body.art === 'bewertung') { if (!vorher) vergessen(p.id); else if (tag) vergessen(p.id, tag); } }
      else toast('Schon gesendet – zu spät zum Zurücknehmen.');
      dispatchEvent(new CustomEvent('halbzeit:gesendet', { detail: p.id }));
    });
  });
}

function sterne(k, name, gross) {
  return `<div class="regler${gross ? ' big' : ''}" data-k="${k}" role="slider" tabindex="0" aria-label="${esc(name)}" aria-valuemin="0.5" aria-valuemax="5" aria-valuenow="0" aria-valuetext="keine Angabe">
    <span class="regler-sterne"><span class="leer" aria-hidden="true">★★★★★</span><span class="voll" aria-hidden="true">★★★★★</span></span>
    <span class="regler-zahl"></span>
    ${gross ? '' : '<button type="button" class="regler-weg" hidden aria-label="Wieder leeren">✕</button>'}
  </div>`;
}
