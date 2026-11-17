// Seite „Platz anlegen“: Verein und Ort eintippen. Die Lage kommt entweder vom Handy
// („Ich bin gerade dort“) oder man tippt den Platz auf der Karte an („Auf der Karte zeigen“),
// z. B. nachträglich von daheim oder als Betreiber.
import { addPlatz, ApiError, cache } from './api.js?v=0.4.5';
import { locate, pos, posFrisch, meters } from './geo.js?v=0.4.5';
import { neueKarte, ortSuchen, START } from './kartenbaustein.js?v=0.4.5';
import { esc, dialog, toast } from './ui.js?v=0.4.5';
import { vorschlaege, offen } from './vorschlaege.js?v=0.4.5';

// #/neu/<text>    Suchtext aus der Platzsuche („… ist noch nicht in der App“) – gleich auf der Karte suchen
// #/neu/osm/<nr>  Platz aus der Vereinsliste – Verein, Ort und Lage sind schon ausgefüllt
export async function render(view, vorschlag = '', nr) {
  let start = null;
  if (vorschlag === 'osm') {
    vorschlag = '';
    start = (await vorschlaege())[Number(nr)] || null;
  }
  view.innerHTML = `
    <section>
      <a class="back" href="#/">‹ Alle Plätze</a>
      <h1>Platz anlegen</h1>
      <form class="card form" id="neu" novalidate>
        <label for="verein">Verein</label>
        <input id="verein" name="verein" type="text" maxlength="60" placeholder="z. B. TSV Musterdorf" autocomplete="off" autocapitalize="words" required>
        <label for="ort">Ort</label>
        <input id="ort" name="ort" type="text" maxlength="40" placeholder="z. B. Musterdorf" autocomplete="off" autocapitalize="words" required>
        <p class="label">Wo liegt der Platz?</p>
        <div class="seg" role="group" aria-label="Lage">
          <button type="button" class="btn" data-modus="hier">📍 Ich bin gerade dort</button>
          <button type="button" class="btn" data-modus="karte">🗺️ Auf der Karte zeigen</button>
        </div>
        <div id="lage" class="lage"></div>
        <p class="error" role="alert"></p>
        <button class="btn btn-primary btn-wide btn-big" type="submit">Platz anlegen</button>
      </form>
      <p class="muted small">Nur Vereinsname und Ort – keine Namen von Personen. Der neue Platz ist gleich für alle sichtbar.</p>
    </section>`;

  const $ = (s) => view.querySelector(s);
  const form = $('#neu');
  if (start) {
    $('#verein').value = start.verein;
    $('#ort').value = start.ort;
    form.insertAdjacentHTML('beforebegin', `<p class="card card-soft small">📋 Aus der Vereinsliste übernommen. ${start.verein ? 'Bitte kurz prüfen, ob der Vereinsname stimmt.' : '<strong>Bitte noch den Verein eintragen.</strong>'}</p>`);
  }
  const err = $('.error');
  let modus = null;
  let wahl = null; // { lat, lon, acc }
  let karte = null;

  const modusSetzen = (m) => {
    modus = m;
    view.querySelectorAll('[data-modus]').forEach((b) => b.classList.toggle('on', b.dataset.modus === m));
    err.textContent = '';
    if (m === 'hier') hierZeigen();
    else karteZeigen();
  };
  view.querySelectorAll('[data-modus]').forEach((b) => b.addEventListener('click', () => modusSetzen(b.dataset.modus)));

  // ---------- Ich bin gerade dort ----------
  function hierZeigen() {
    if (posFrisch()) {
      wahl = { lat: pos.lat, lon: pos.lon, acc: pos.acc };
      $('#lage').innerHTML = `
        <p>✅ Lage übernommen <span class="muted">(genau auf ca. ${pos.acc} m)</span></p>
        ${pos.acc > 300 ? '<p class="warn">Ziemlich ungenau. Am besten nochmal unter freiem Himmel – oder auf der Karte zeigen.</p>' : ''}
        <button type="button" class="link" id="lage-neu">Lage neu bestimmen</button>`;
      $('#lage-neu').addEventListener('click', holen);
    } else {
      wahl = null;
      $('#lage').innerHTML = '<p class="muted">Suche deinen Standort …</p>';
      holen();
    }
  }
  async function holen() {
    err.textContent = '';
    $('#lage').innerHTML = '<p class="muted">Suche deinen Standort …</p>';
    try {
      await locate();
    } catch (ex) {
      err.textContent = ex.message;
      $('#lage').innerHTML = '';
      return;
    }
    if (modus === 'hier') hierZeigen();
  }

  // ---------- Auf der Karte zeigen ----------
  async function karteZeigen() {
    wahl = null;
    $('#lage').innerHTML = `
      <div class="suchzeile">
        <input type="search" id="ortsuche" placeholder="Ort oder Verein, z. B. Arnshausen" value="${esc(vorschlag || $('#ort').value)}" enterkeyhint="search" autocomplete="off">
        <button type="button" class="btn" id="suchen">Suchen</button>
      </div>
      <div id="treffer"></div>
      <div id="karte" class="pickmap" aria-label="Karte: tippe auf den Sportplatz"></div>
      <p id="wahl" class="small">Tippe auf der Karte auf den Sportplatz. <strong>Graue Punkte</strong> sind bekannte Fußballplätze – antippen übernimmt sie.</p>`;
    const suchen = async () => {
      const text = $('#ortsuche').value.trim();
      if (text.length < 2) return;
      $('#treffer').innerHTML = '<p class="muted small">Suche …</p>';
      try {
        const rows = await ortSuchen(text);
        if (!rows.length) { $('#treffer').innerHTML = '<p class="small">Nichts gefunden. Stimmt die Schreibweise? Probier nur den Ortsnamen – oder schieb die Karte selbst hin.</p>'; return; }
        // Nur Orte außerhalb von Unterfranken (über 80 km von der Mitte)? Dann ist es wohl ein Tippfehler
        const weit = rows.every((r) => meters(START.lat, START.lon, r.lat, r.lon) > 80_000);
        const hinweis = weit ? '<p class="warn small">Nur weit entfernte Orte gefunden. Stimmt die Schreibweise? Fehlt vielleicht ein Buchstabe?</p>' : '';
        if (rows.length === 1 && !weit) { $('#treffer').innerHTML = ''; springen(rows[0]); return; }
        $('#treffer').innerHTML = hinweis + `<ul class="treffer">${rows.map((r, i) => `<li><button type="button" class="link" data-i="${i}">${r.sport ? '⚽' : '📍'} ${esc(r.name)}</button></li>`).join('')}</ul>`;
        $('#treffer').querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => { $('#treffer').innerHTML = ''; springen(rows[b.dataset.i]); }));
      } catch (ex) {
        $('#treffer').innerHTML = `<p class="small">${esc(ex.message)}</p>`;
      }
    };
    $('#suchen').addEventListener('click', suchen);
    $('#ortsuche').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); suchen(); } });

    try {
      karte = await neueKarte($('#karte'), start ? { lat: start.lat, lon: start.lon, zoom: 17 } : posFrisch() ? { lat: pos.lat, lon: pos.lon, zoom: 15 } : {});
    } catch (ex) {
      $('#karte').outerHTML = `<p class="error">${esc(ex.message)}</p>`;
      return;
    }
    const { L, map } = karte;
    // Vorhandene Plätze zeigen, damit niemand doppelt anlegt
    for (const p of cache.plaetze || []) {
      L.circleMarker([p.lat, p.lon], { radius: 7, color: '#1c6b35', weight: 2, fillColor: '#ffffff', fillOpacity: 1 })
        .bindTooltip(esc(p.verein)).addTo(map);
    }
    let nadel = null;
    nadelSetzen = (lat, lon, text = 'Stelle gewählt.') => {
      wahl = { lat, lon, acc: null };
      if (nadel) nadel.setLatLng([lat, lon]);
      else nadel = L.marker([lat, lon]).addTo(map);
      $('#wahl').innerHTML = `✅ <strong>${text}</strong> Falsch? Einfach woanders hintippen.`;
      err.textContent = '';
    };
    map.on('click', (e) => nadelSetzen(e.latlng.lat, e.latlng.lng));
    // Fußballplätze aus der Vereinsliste als graue Punkte: antippen = übernehmen
    for (const v of offen(await vorschlaege(), cache.plaetze || [])) {
      L.circleMarker([v.lat, v.lon], { radius: 7, color: '#ffffff', weight: 2, fillColor: '#8a948f', fillOpacity: 0.9 })
        .bindTooltip(esc(v.name))
        .on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          nadelSetzen(v.lat, v.lon, `${esc(v.name)} übernommen.`);
          if (!$('#verein').value.trim() && v.verein) $('#verein').value = v.verein;
          if (!$('#ort').value.trim()) $('#ort').value = v.ort;
        })
        .addTo(map);
    }
    if (start) nadelSetzen(start.lat, start.lon, 'Lage aus der Vereinsliste.');
    else if ($('#ortsuche').value.trim().length >= 2 && (vorschlag || !posFrisch())) suchen();
  }
  let nadelSetzen = () => {};
  function springen(r) {
    if (!karte) return;
    if (r.sport) {
      karte.map.setView([r.lat, r.lon], 17);
      nadelSetzen(r.lat, r.lon, 'Sportplatz gefunden.');
    } else {
      karte.map.setView([r.lat, r.lon], 14);
    }
  }

  if (vorschlag || start) modusSetzen('karte');
  else if (posFrisch()) modusSetzen('hier');
  if ((!vorschlag && !start) || (start && !start.verein)) $('#verein').focus();

  // ---------- Anlegen ----------
  const senden = async (trotzdem = false) => {
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Lege an …';
    try {
      const p = await addPlatz({ verein: $('#verein').value, ort: $('#ort').value, lat: wahl.lat, lon: wahl.lon, trotzdem });
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
    if (!wahl) {
      err.textContent = modus === 'karte' ? 'Bitte auf der Karte auf den Platz tippen.' : 'Bitte wählen: Bist du gerade dort, oder zeigst du ihn auf der Karte?';
      return;
    }
    senden();
  });
}
