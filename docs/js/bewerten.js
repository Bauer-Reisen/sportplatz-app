// Seite „Bewerten“.
//   #/bewerten               → Platz wählen („Wo bin ich?“ oder Suche)
//   #/bewerten/<id>          → Sterne (+ freiwillig: Einzelnoten, Angebot, Bierpreis)
//   #/bewerten/<id>/angebot  → nur Angebot eintragen, ohne Sterne (z. B. als Betreiber)
// Gesendet wird über die Warteschlange (senden.js): klappt auch ohne Netz, 10 Sekunden „Rückgängig“.
import { HIER_METER } from './config.js?v=0.3.2';
import { getPlaetze, findPlatz, getPlatz } from './api.js?v=0.3.2';
import { locate, pos, posFrisch, meters, fmtDist } from './geo.js?v=0.3.2';
import { ANGEBOT } from './angebot.js?v=0.3.2';
import { einreihen, zuruecknehmen, heuteBewertet, neueId, WARTEN_MS } from './senden.js?v=0.3.2';
import { esc, toast, undoBar } from './ui.js?v=0.3.2';
import { platzSuche } from './suche.js?v=0.3.2';

const WORTE = ['', 'Lieber nicht', 'Geht so', 'Ordentlich', 'Gut', 'Top!'];
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
  try { plaetze = await getPlaetze(); } catch (ex) { $('#liste').innerHTML = `<li class="muted">${esc(ex.message)}</li>`; }

  const zeichnen = () => {
    const q = $('#suche').value.trim();
    if (!q) { $('#liste').innerHTML = ''; return; }
    const rows = platzSuche(plaetze, q).slice(0, 30);
    $('#liste').innerHTML = rows.length
      ? rows.map((p) => `<li><a href="#/bewerten/${esc(p.id)}"><span class="pname">${esc(p.verein)}</span><span class="pmeta">${esc(p.ort)}</span></a></li>`).join('')
      : `<li class="nichtda"><p><strong>„${esc(q)}“ ist noch nicht in der App.</strong> Vielleicht hat ihn noch niemand angelegt.</p><a class="btn btn-primary btn-wide" href="#/neu/${encodeURIComponent(q)}">🗺️ Auf der Karte suchen und anlegen</a></li>`;
  };
  const hierZeigen = () => {
    const best = plaetze.map((p) => ({ ...p, m: meters(pos.lat, pos.lon, p.lat, p.lon) })).sort((a, b) => a.m - b.m)[0];
    $('#hier').innerHTML = best && best.m <= HIER_METER
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
  view.innerHTML = '<p class="loading">Lade …</p>';
  try { daten = await getPlatz(id); p = daten.platz; } catch (ex) { if (ex.status === 404) p = null; }
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
  const weit = posFrisch() && meters(pos.lat, pos.lon, p.lat, p.lon) > 2000;

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
          <button type="button" class="btn${weit ? '' : ' on'}" data-b="heute">Heute</button>
          <button type="button" class="btn${weit ? ' on' : ''}" data-b="kuerzlich">Vor ein paar Tagen</button>
        </div>
        <p class="label">Wie war's insgesamt?</p>
        ${sterne('gesamt', 'Gesamt', true)}
        <p class="sternwort" id="wort" aria-live="polite">Tippe auf die Sterne</p>
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
  let besuch = weit ? 'kuerzlich' : 'heute';
  let groesse = '0,5';

  // Sterne
  view.querySelectorAll('.stars').forEach((g) => {
    g.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      const k = g.dataset.k;
      const v = Number(b.dataset.v);
      werte[k] = werte[k] === v && k !== 'gesamt' ? null : v; // Einzelnoten durch nochmal Tippen wieder leeren
      g.querySelectorAll('button').forEach((x) => {
        x.classList.toggle('on', werte[k] != null && Number(x.dataset.v) <= werte[k]);
        x.setAttribute('aria-checked', String(Number(x.dataset.v) === werte[k]));
      });
      if (k === 'gesamt') { $('#wort').textContent = WORTE[v]; $('.error').textContent = ''; }
      if (navigator.vibrate) navigator.vibrate(10);
    }));
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
    if (!nurAngebot && !werte.gesamt) { err.textContent = 'Bitte zuerst die Gesamt-Sterne antippen.'; return; }
    if (nurAngebot && !Object.keys(angebot).length && bierpreis == null) { err.textContent = 'Bitte mindestens eine Kachel antippen oder den Bierpreis eintragen.'; return; }

    const body = {
      id: neueId(), platz: p.id,
      art: nurAngebot ? 'angebot' : 'bewertung',
      besuch: nurAngebot ? 'heute' : besuch,
      ...(nurAngebot ? {} : { gesamt: werte.gesamt, bier: werte.bier ?? null, essen: werte.essen ?? null, preise: werte.preise ?? null, stimmung: werte.stimmung ?? null }),
      angebot: mitAngebot ? angebot : {},
      bierpreis, groesse: bierpreis == null ? null : groesse,
    };
    einreihen(body);
    if (navigator.vibrate) navigator.vibrate(30);
    location.hash = `#/platz/${p.id}`;
    undoBar(navigator.onLine ? 'Danke! Wird gleich gesendet …' : 'Danke! Gespeichert – wird gesendet, sobald Netz da ist.', WARTEN_MS, () => {
      if (zuruecknehmen(body.id)) toast('Zurückgenommen – nichts gesendet.');
      else toast('Schon gesendet – zu spät zum Zurücknehmen.');
      dispatchEvent(new CustomEvent('halbzeit:gesendet', { detail: p.id }));
    });
  });
}

function sterne(k, name, gross) {
  return `<div class="stars${gross ? ' big' : ''}" data-k="${k}" role="radiogroup" aria-label="${esc(name)}">
    ${[1, 2, 3, 4, 5].map((v) => `<button type="button" data-v="${v}" role="radio" aria-checked="false" aria-label="${v} ${v === 1 ? 'Stern' : 'Sterne'}">★</button>`).join('')}
  </div>`;
}
