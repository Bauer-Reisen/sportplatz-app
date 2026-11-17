// Verwaltung – nur mit dem Verwaltungs-Code (steht als Secret ADMIN_CODE bei Cloudflare, nie im Code).
// Der Code wird nur auf diesem Handy gemerkt. Normale Nutzer brauchen ihn nie.
import { call } from './api.js?v=0.4.2';
import { store } from './store.js?v=0.4.2';
import { esc, dialog, toast, datum } from './ui.js?v=0.4.2';

const admin = (path, opt = {}) => call(`/api/admin${path}`, { ...opt, headers: { 'X-Admin': store.get('adminCode') || '' } });

export async function render(view) {
  if (!store.get('adminCode')) return anmelden(view);
  view.innerHTML = '<p class="loading">Lade …</p>';
  let d;
  try {
    d = await admin('');
  } catch (ex) {
    if (ex.status === 401) { store.del('adminCode'); return anmelden(view, ex.message); }
    view.innerHTML = `<section><a class="back" href="#/mehr">‹ Mehr</a><h1>Verwaltung</h1><p class="error">${esc(ex.message)}</p></section>`;
    return;
  }

  const eintragZeile = (e) => {
    let ang = {};
    try { ang = JSON.parse(e.angebot || '{}'); } catch { /* leer */ }
    const was = e.art === 'angebot' ? `Angebot: ${esc(Object.entries(ang).map(([k, v]) => `${k} ${v ? '✓' : '✗'}`).join(', ') || '–')}` : `${'★'.repeat(e.gesamt || 0)}`;
    return `
      <li class="vw">
        <p><strong>${esc(e.verein || '?')}</strong> (${esc(e.ort || '')}) · ${datum(e.tag)}<br>
          ${was}${e.bierpreis != null ? ` · Bier ${String(e.bierpreis).replace('.', ',')} € / ${esc(e.groesse)} l` : ''}<br>
          <span class="${e.versteckt ? 'nein' : 'muted'} small">${e.versteckt ? 'ausgeblendet' : 'sichtbar'} · ${e.meldungen} Meldung(en)${e.gruende ? `: ${esc(e.gruende)}` : ''}</span></p>
        <div class="vw-knoepfe">
          ${e.versteckt ? `<button type="button" class="btn" data-b="${esc(e.id)}" data-a="zeigen">Wieder zeigen</button>` : `<button type="button" class="btn" data-b="${esc(e.id)}" data-a="ausblenden">Ausblenden</button>`}
          <button type="button" class="btn" data-b="${esc(e.id)}" data-a="entfernen">Entfernen</button>
        </div>
      </li>`;
  };

  view.innerHTML = `
    <section>
      <a class="back" href="#/mehr">‹ Mehr</a>
      <h1>Verwaltung</h1>
      <div class="card ${d.schreibenErlaubt ? '' : 'card-warn'}">
        <h3>Notbremse</h3>
        <p class="small">${d.schreibenErlaubt ? 'Bewerten ist für alle <strong>an</strong>.' : '<strong>Bewerten ist pausiert.</strong> Niemand kann gerade etwas eintragen.'}</p>
        <button type="button" class="btn btn-wide" id="bremse">${d.schreibenErlaubt ? '⏸ Bewerten pausieren' : '▶️ Bewerten wieder erlauben'}</button>
      </div>
      <div class="card">
        <h3>Gemeldete Einträge (${d.eintraege.length})</h3>
        ${d.eintraege.length ? `<ul class="list-plain">${d.eintraege.map(eintragZeile).join('')}</ul>` : '<p class="muted small">Nichts gemeldet. 👍</p>'}
      </div>
      <div class="card">
        <h3>Plätze (${d.plaetze.length})</h3>
        <ul class="list-plain">${d.plaetze.map((p) => `
          <li class="vw">
            <p><strong>${esc(p.verein)}</strong> (${esc(p.ort)})${p.versteckt ? ' · <span class="nein">ausgeblendet</span>' : ''}<br>
              <span class="muted small">angelegt ${datum(p.angelegt)} · ${p.eintraege} Einträge</span></p>
            <div class="vw-knoepfe">
              <button type="button" class="btn" data-p="${esc(p.id)}" data-a="${p.versteckt ? 'zeigen' : 'ausblenden'}">${p.versteckt ? 'Wieder zeigen' : 'Ausblenden'}</button>
              <button type="button" class="btn" data-p="${esc(p.id)}" data-a="angebot_zuruecksetzen">Angebot zurücksetzen</button>
            </div>
          </li>`).join('')}</ul>
      </div>
      <div class="card card-soft">
        <h3>Sicherung</h3>
        <p class="small">Lädt alle Plätze und Einträge als eine Datei herunter. Ab und zu machen und gut aufheben.</p>
        <button type="button" class="btn btn-wide" id="sicherung">💾 Sicherung herunterladen</button>
      </div>
      <p class="center"><button type="button" class="link" id="vergessen">Code auf diesem Handy vergessen</button></p>
    </section>`;

  const $ = (s) => view.querySelector(s);
  const neu = () => render(view);
  const fragen = (title, text, ok) => dialog({ title, body: `<p>${text}</p>`, buttons: [{ label: 'Abbrechen', value: 'nein' }, { label: ok, value: 'ja', primary: true }] }).then((r) => r?.value === 'ja');

  $('#bremse').addEventListener('click', async () => {
    try { await admin('/schreiben', { method: 'POST', body: { erlaubt: !d.schreibenErlaubt } }); toast('Gespeichert.'); neu(); } catch (ex) { toast(ex.message, 4000); }
  });
  view.querySelectorAll('[data-b]').forEach((b) => b.addEventListener('click', async () => {
    if (b.dataset.a === 'entfernen' && !(await fragen('Endgültig entfernen?', 'Der Eintrag wird gelöscht und lässt sich nicht zurückholen. (Nur Ausblenden lässt sich rückgängig machen.)', 'Entfernen'))) return;
    try { await admin(`/bewertung/${b.dataset.b}`, { method: 'POST', body: { aktion: b.dataset.a } }); toast('Erledigt.'); neu(); } catch (ex) { toast(ex.message, 4000); }
  }));
  view.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', async () => {
    if (b.dataset.a === 'angebot_zuruecksetzen' && !(await fragen('Angebot zurücksetzen?', 'Alle bisherigen Angaben zum Angebot zählen für diesen Platz nicht mehr (z. B. neuer Wirt). Die Sterne bleiben.', 'Zurücksetzen'))) return;
    try { await admin(`/platz/${b.dataset.p}`, { method: 'POST', body: { aktion: b.dataset.a } }); toast('Erledigt.'); neu(); } catch (ex) { toast(ex.message, 4000); }
  }));
  $('#sicherung').addEventListener('click', async () => {
    try {
      const daten = await admin('/sicherung');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(daten, null, 2)], { type: 'application/json' }));
      a.download = `halbzeit-sicherung-${d.heute}.json`;
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (ex) { toast(ex.message, 4000); }
  });
  $('#vergessen').addEventListener('click', () => { store.del('adminCode'); toast('Code vergessen.'); location.hash = '#/mehr'; });
}

function anmelden(view, fehler = '') {
  view.innerHTML = `
    <section>
      <a class="back" href="#/mehr">‹ Mehr</a>
      <h1>Verwaltung</h1>
      <p class="lead">Nur für die Verwaltung der App. Zum Bewerten braucht man keinen Code.</p>
      <form class="card form" id="code" novalidate>
        <label for="c">Verwaltungs-Code</label>
        <input id="c" type="password" autocomplete="off" autocapitalize="off" spellcheck="false">
        <p class="error" role="alert">${esc(fehler)}</p>
        <button class="btn btn-primary btn-wide" type="submit">Weiter</button>
      </form>
    </section>`;
  view.querySelector('#code').addEventListener('submit', (e) => {
    e.preventDefault();
    const c = view.querySelector('#c').value.trim();
    if (!c) return;
    store.set('adminCode', c);
    render(view);
  });
}
