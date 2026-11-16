// Seite „Platz anlegen“: am Platz Verein und Ort eintippen, die Lage kommt vom Handy.
import { addPlatz, ApiError } from './api.js?v=0.2.0';
import { locate, pos, posFrisch } from './geo.js?v=0.2.0';
import { esc, dialog, toast } from './ui.js?v=0.2.0';

export function render(view) {
  view.innerHTML = `
    <section>
      <a class="back" href="#/">‹ Alle Plätze</a>
      <h1>Platz anlegen</h1>
      <p class="lead">Am besten direkt am Platz – dann stimmt die Lage.</p>
      <form class="card form" id="neu" novalidate>
        <label for="verein">Verein</label>
        <input id="verein" name="verein" type="text" maxlength="60" placeholder="z. B. TSV Musterdorf" autocomplete="off" autocapitalize="words" required>
        <label for="ort">Ort</label>
        <input id="ort" name="ort" type="text" maxlength="40" placeholder="z. B. Musterdorf" autocomplete="off" autocapitalize="words" required>
        <p class="label">Lage</p>
        <div id="lage" class="lage"></div>
        <p class="error" role="alert"></p>
        <button class="btn btn-primary btn-wide btn-big" type="submit">Platz anlegen</button>
      </form>
      <p class="muted small">Nur Vereinsname und Ort – keine Namen von Personen. Der neue Platz ist gleich für alle sichtbar.</p>
    </section>`;

  const $ = (s) => view.querySelector(s);
  const form = $('#neu');
  const err = $('.error');

  const lageZeigen = () => {
    $('#lage').innerHTML = posFrisch()
      ? `<p>✅ Lage übernommen <span class="muted">(genau auf ca. ${pos.acc} m)</span></p>
         ${pos.acc > 300 ? '<p class="warn">Ziemlich ungenau. Am besten nochmal unter freiem Himmel versuchen.</p>' : ''}
         <button type="button" class="link" id="lage-neu">Lage neu bestimmen</button>`
      : '<button type="button" class="btn btn-wide" id="lage-neu">📍 Lage vom Handy übernehmen</button>';
    $('#lage-neu').addEventListener('click', holen);
  };
  async function holen() {
    err.textContent = '';
    $('#lage').innerHTML = '<p class="muted">Suche deinen Standort …</p>';
    try { await locate(); } catch (ex) { err.textContent = ex.message; }
    lageZeigen();
  }
  lageZeigen();
  if (!posFrisch()) holen();
  $('#verein').focus();

  const senden = async (trotzdem = false) => {
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Lege an …';
    try {
      const p = await addPlatz({ verein: $('#verein').value, ort: $('#ort').value, lat: pos.lat, lon: pos.lon, trotzdem });
      toast('Platz angelegt ✓');
      location.hash = `#/platz/${p.id}`;
    } catch (ex) {
      if (ex instanceof ApiError && ex.status === 409 && ex.data.platz) {
        const alt = ex.data.platz;
        const r = await dialog({
          title: 'Gibt es den schon?',
          body: `<p>Ganz in der Nähe gibt es schon <strong>${esc(alt.verein)}</strong> (${esc(alt.ort)}).</p><p>Ist das derselbe Platz?</p>`,
          buttons: [{ label: 'Nein, neu anlegen', value: 'neu' }, { label: 'Ja, zum Platz', value: 'alt', primary: true }],
        });
        if (r?.value === 'alt') { location.hash = `#/platz/${alt.id}`; return; }
        if (r?.value === 'neu') return senden(true);
      } else {
        err.textContent = ex.message;
      }
    } finally {
      btn.disabled = false; btn.textContent = 'Platz anlegen';
    }
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    err.textContent = '';
    if ($('#verein').value.trim().length < 2) { err.textContent = 'Bitte den Verein eintragen.'; return; }
    if ($('#ort').value.trim().length < 2) { err.textContent = 'Bitte den Ort eintragen.'; return; }
    if (!posFrisch()) { err.textContent = 'Bitte erst die Lage übernehmen.'; return; }
    senden();
  });
}
