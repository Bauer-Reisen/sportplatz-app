// Seite eines Platzes. Bewertungen kommen in Abschnitt 3.
import { getPlaetze, findPlatz } from './api.js?v=0.2.0';
import { mapsLink, posFrisch, pos, meters, fmtDist } from './geo.js?v=0.2.0';
import { esc } from './ui.js?v=0.2.0';

const fmtDatum = (iso) => (iso ? iso.split('-').reverse().join('.') : '');

export async function render(view, id) {
  let p = findPlatz(id);
  if (!p) {
    try { await getPlaetze(true); p = findPlatz(id); } catch { /* unten */ }
  }
  if (!p) {
    view.innerHTML = `
      <section>
        <h1>Platz nicht gefunden</h1>
        <p class="lead">Vielleicht wurde er ausgeblendet – oder gerade ist kein Netz.</p>
        <a class="btn btn-wide" href="#/">Zur Liste</a>
      </section>`;
    return;
  }
  const m = posFrisch() ? meters(pos.lat, pos.lon, p.lat, p.lon) : null;
  view.innerHTML = `
    <section>
      <a class="back" href="#/">‹ Alle Plätze</a>
      <h1>${esc(p.verein)}</h1>
      <p class="lead">${esc(p.ort)}${m == null ? '' : m < 150 ? ' · 📍 Du bist hier' : ` · ${fmtDist(m)} entfernt`}</p>
      <div class="card soon">
        <span class="tag">Kommt als Nächstes</span>
        <p>Hier stehen bald die Noten für Bier, Essen, Preise und Stimmung – und was es an diesem Platz gibt.</p>
      </div>
      <a class="btn btn-wide" href="${esc(mapsLink(p))}" target="_blank" rel="noopener">🗺️ In Karten-App öffnen</a>
      <p class="muted small center" style="margin-top:16px">Angelegt am ${esc(fmtDatum(p.angelegt))}</p>
    </section>`;
}
