// Seite eines Platzes: Noten, was es gibt (✓ / ✗ / ?), Bierpreis, letzte Einträge mit „Melden“.
import { getPlatz, findPlatz, melden } from './api.js?v=0.3.1';
import { mapsLink, posFrisch, pos, meters, fmtDist } from './geo.js?v=0.3.1';
import { ANGEBOT } from './angebot.js?v=0.3.1';
import { heuteBewertet, wartend, geraet } from './senden.js?v=0.3.1';
import { store } from './store.js?v=0.3.1';
import { esc, dialog, toast, zahl, datum } from './ui.js?v=0.3.1';

const NAMEN = { gesamt: 'Gesamt', bier: '🍺 Bier', essen: '🌭 Essen', preise: '💶 Preise', stimmung: '🎉 Stimmung' };
const GRUENDE = [
  { v: 'stimmt nicht', t: 'Stimmt nicht / falscher Platz' },
  { v: 'beleidigend', t: 'Beleidigend' },
  { v: 'werbung', t: 'Werbung oder Fake' },
];

export const sterneText = (x) => {
  const voll = Math.round(x);
  return `<span class="gold" aria-hidden="true">${'★'.repeat(voll)}</span><span class="grau" aria-hidden="true">${'★'.repeat(5 - voll)}</span>`;
};

export async function render(view, id) {
  const schnell = findPlatz(id);
  view.innerHTML = schnell
    ? `<section><a class="back" href="#/">‹ Alle Plätze</a><h1>${esc(schnell.verein)}</h1><p class="lead">${esc(schnell.ort)}</p><p class="muted">Lade Bewertungen …</p></section>`
    : '<p class="loading">Lade …</p>';

  let d;
  try {
    d = await getPlatz(id);
  } catch (ex) {
    view.innerHTML = `
      <section>
        <a class="back" href="#/">‹ Alle Plätze</a>
        <h1>${ex.status === 404 ? 'Platz nicht gefunden' : 'Gerade kein Netz'}</h1>
        <p class="lead">${ex.status === 404 ? 'Vielleicht wurde er ausgeblendet.' : 'Diesen Platz hast du ohne Netz noch nicht geöffnet. Bewerten geht trotzdem – es wird später gesendet.'}</p>
        ${ex.status === 404 ? '' : `<a class="btn btn-primary btn-wide btn-big" href="#/bewerten/${esc(id)}">⭐ Jetzt bewerten</a>`}
        <a class="btn btn-wide" style="margin-top:10px" href="#/">Zur Liste</a>
      </section>`;
    return;
  }
  const p = d.platz;
  const m = posFrisch() ? meters(pos.lat, pos.lon, p.lat, p.lon) : null;
  const schonHeute = heuteBewertet(p.id);
  const warten = wartend(p.id).length;
  const g = d.noten.gesamt;

  // ---------- Noten ----------
  const notenHtml = g.schnitt != null
    ? `<div class="note-gross">
         <span class="zahl">${zahl(g.schnitt)}</span>
         <span><span class="sterne">${sterneText(g.schnitt)}</span><br><span class="muted small">${g.n} ${g.n === 1 ? 'Bewertung' : 'Bewertungen'}${g.veraltet ? ` · <span class="alt">letzte vom ${datum(g.zuletzt)}</span>` : ''}</span></span>
       </div>
       ${g.n < d.min ? '<p class="wenige small">Erst wenige Bewertungen – die Note kann sich noch deutlich ändern.</p>' : ''}
       <ul class="einzelnoten">
         ${['bier', 'essen', 'preise', 'stimmung'].map((k) => {
           const x = d.noten[k];
           return `<li><span>${NAMEN[k]}</span>${x.schnitt != null ? `<span><span class="sterne klein">${sterneText(x.schnitt)}</span> ${zahl(x.schnitt)}${x.n < d.min ? ` <span class="muted small">(${x.n}×)</span>` : ''}</span>` : '<span class="muted small">–</span>'}</li>`;
         }).join('')}
       </ul>`
    : '<p><strong>Noch keine Bewertungen.</strong> Sei die oder der Erste!</p>';

  // ---------- Angebot ----------
  const bekannt = ANGEBOT.map((a) => ({ ...a, ...d.angebot[a.k] })).filter((a) => a.status && a.status !== 'unbekannt');
  const zeile = (a) => {
    const zeichen = a.status === 'ja' ? '<span class="ok">✓</span>' : a.status === 'nein' ? '<span class="nein">✗</span>' : '<span class="unklar">?</span>';
    const text = a.status === 'nein' ? ' <span class="muted small">gibt es nicht (mehr)</span>' : a.status === 'unklar' ? ` <span class="muted small">unklar – Angaben widersprechen sich (${a.ja}× ja, ${a.nein}× nein)</span>` : '';
    const alt = a.veraltet ? ` <span class="alt small">veraltet – zuletzt bestätigt ${datum(a.stand)}</span>` : '';
    return `<li>${zeichen} ${a.e} ${esc(a.t)}${text}${alt}</li>`;
  };
  const preise = Object.entries(d.bierpreis || {});
  const angebotHtml = bekannt.length || preise.length
    ? `${preise.length ? `<p class="bierpreis">🍺 ${preise.map(([gr, x]) => `<strong>${zahl(x.preis, 2)} €</strong> für ${gr} l${x.veraltet ? ` <span class="alt small">(Stand ${datum(x.stand)})</span>` : ''}`).join(' · ')}</p>` : ''}
       <ul class="angebot">${['ja', 'unklar', 'nein'].flatMap((s) => bekannt.filter((a) => a.status === s)).map(zeile).join('')}</ul>
       <p class="muted small">Es zählen je Sache die letzten 5 Angaben. Neuere gehen vor.</p>`
    : '<p class="muted">Noch keine Angaben.</p>';

  // ---------- Letzte Einträge ----------
  const gemeldet = new Set(lesen('gemeldet'));
  const eintraege = d.eintraege.slice(0, 15);
  const eintragHtml = eintraege.length
    ? `<ul class="eintraege">${eintraege.map((e) => `
        <li>
          <span>${e.art === 'angebot' ? '📝 Angebot eingetragen' : `<span class="sterne klein">${sterneText(e.gesamt)}</span>`}</span>
          <span class="muted small">${datum(e.tag)}${e.besuch === 'kuerzlich' ? ' (Besuch ein paar Tage vorher)' : ''}</span>
          ${gemeldet.has(e.id) ? '<span class="muted small">gemeldet</span>' : `<button type="button" class="link small melden" data-id="${esc(e.id)}">Melden</button>`}
        </li>`).join('')}</ul>`
    : '<p class="muted">Noch nichts eingetragen.</p>';

  view.innerHTML = `
    <section>
      <a class="back" href="#/">‹ Alle Plätze</a>
      <h1>${esc(p.verein)}</h1>
      <p class="lead">${esc(p.ort)}${m == null ? '' : m < 150 ? ' · 📍 Du bist hier' : ` · ${fmtDist(m)} entfernt`}</p>
      ${d.offline ? '<p class="warn small">Ohne Netz – so sah es beim letzten Öffnen aus.</p>' : ''}
      ${warten ? `<p class="card card-soft small">⏳ Dein Eintrag wartet aufs Senden. Er geht von selbst raus, sobald Netz da ist.</p>` : ''}
      ${schonHeute
        ? '<p class="card card-soft">✅ Du hast hier heute schon etwas eingetragen. Danke!</p>'
        : `<a class="btn btn-primary btn-wide btn-big" href="#/bewerten/${esc(p.id)}">⭐ Jetzt bewerten</a>`}
      <div class="card" style="margin-top:16px">
        <h2>Noten</h2>
        ${notenHtml}
      </div>
      <div class="card">
        <h2>Was gibt es hier?</h2>
        ${angebotHtml}
        ${schonHeute ? '' : `<a class="link" href="#/bewerten/${esc(p.id)}/angebot">Angebot ergänzen oder korrigieren</a>`}
      </div>
      <div class="card">
        <h2>Letzte Einträge</h2>
        ${eintragHtml}
      </div>
      <a class="btn btn-wide" href="${esc(mapsLink(p))}" target="_blank" rel="noopener">🗺️ In Karten-App öffnen</a>
      <p class="muted small center" style="margin-top:16px">Angelegt am ${esc(datum(p.angelegt))}</p>
    </section>`;

  view.querySelectorAll('.melden').forEach((b) => b.addEventListener('click', async () => {
    const r = await dialog({
      title: 'Eintrag melden',
      body: `<p>Was stimmt mit diesem Eintrag nicht?</p>
        <div class="gruende">${GRUENDE.map((x, i) => `<label class="grund"><input type="radio" name="grund" value="${esc(x.v)}"${i === 0 ? ' checked' : ''}> ${esc(x.t)}</label>`).join('')}</div>
        <p class="muted small">Ab 3 Meldungen wird der Eintrag ausgeblendet.</p>`,
      buttons: [{ label: 'Abbrechen', value: 'nein' }, { label: 'Melden', value: 'ja', primary: true }],
    });
    if (r?.value !== 'ja') return;
    try {
      await melden(b.dataset.id, geraet(), r.fields.grund);
      gemeldet.add(b.dataset.id);
      store.set('gemeldet', JSON.stringify([...gemeldet].slice(-200)));
      b.outerHTML = '<span class="muted small">gemeldet</span>';
      toast('Danke, ist gemeldet.');
    } catch (ex) {
      toast(ex.message, 4000);
    }
  }));
}

function lesen(k) { try { return JSON.parse(store.get(k) || '[]'); } catch { return []; } }
