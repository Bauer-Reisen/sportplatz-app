// Seite „Karte“: alle Plätze auf einer Karte, farbig nach Gesamt-Note.
// Grün ab 4, gelb ab 3, rot darunter, grau = noch zu wenige Bewertungen.
import { getPlaetze } from './api.js?v=0.3.1';
import { locate, pos, posFrisch } from './geo.js?v=0.3.1';
import { neueKarte } from './kartenbaustein.js?v=0.3.1';
import { esc, zahl } from './ui.js?v=0.3.1';

const WENIGE = 3; // darunter blass
export const farbe = (s) => (s == null ? '#8a948f' : s >= 4 ? '#1c8a3f' : s >= 3 ? '#e0a100' : '#c0392b');

export async function render(view) {
  view.innerHTML = `
    <section class="kartenseite">
      <div class="kartenkopf">
        <h1>Karte</h1>
        <button type="button" class="btn" id="wo">📍 Wo bin ich?</button>
      </div>
      <div id="karte" class="grosskarte" aria-label="Karte mit allen Plätzen"></div>
      <p class="legende small">
        <span><i style="background:${farbe(4)}"></i> ab 4 ★</span>
        <span><i style="background:${farbe(3)}"></i> 3 bis 4</span>
        <span><i style="background:${farbe(2)}"></i> unter 3</span>
        <span><i style="background:${farbe(4)};opacity:.45"></i> blass = erst wenige</span>
        <span><i style="background:${farbe(null)}"></i> noch nicht bewertet</span>
      </p>
      <p class="muted small" id="status"></p>
    </section>`;
  const $ = (s) => view.querySelector(s);

  let plaetze = [];
  try { plaetze = await getPlaetze(); } catch (ex) { $('#status').textContent = ex.message; }

  let karte;
  try {
    karte = await neueKarte($('#karte'), posFrisch() ? { lat: pos.lat, lon: pos.lon, zoom: 12 } : {});
  } catch (ex) {
    $('#karte').outerHTML = `<p class="error">${esc(ex.message)}</p>`;
    return;
  }
  const { L, map } = karte;
  for (const p of plaetze) {
    L.circleMarker([p.lat, p.lon], { radius: 11, color: '#ffffff', weight: 2.5, fillColor: farbe(p.schnitt), fillOpacity: p.n && p.n < WENIGE ? 0.45 : 1 })
      .bindPopup(`<strong>${esc(p.verein)}</strong><br>${esc(p.ort)}<br>${p.schnitt != null ? `<span class="gold">★</span> ${zahl(p.schnitt)} · ${p.n} ${p.n === 1 ? 'Bewertung' : 'Bewertungen'}${p.n < WENIGE ? ' (erst wenige)' : ''}` : 'noch nicht bewertet'}<br><a href="#/platz/${esc(p.id)}">Ansehen ›</a>`)
      .addTo(map);
  }
  if (!posFrisch() && plaetze.length) {
    map.fitBounds(L.latLngBounds(plaetze.map((p) => [p.lat, p.lon])).pad(0.2), { maxZoom: 13 });
  }
  $('#status').textContent = plaetze.length ? `${plaetze.length} ${plaetze.length === 1 ? 'Platz' : 'Plätze'} – antippen für Details.` : 'Noch keine Plätze.';

  let ich = null;
  const ichZeigen = () => {
    if (!posFrisch()) return;
    if (ich) ich.setLatLng([pos.lat, pos.lon]);
    else ich = L.circleMarker([pos.lat, pos.lon], { radius: 8, color: '#ffffff', weight: 3, fillColor: '#1a73e8', fillOpacity: 1 }).bindTooltip('Du').addTo(map);
  };
  ichZeigen();
  $('#wo').addEventListener('click', async () => {
    const btn = $('#wo');
    btn.disabled = true; btn.textContent = '📍 Suche …';
    try { await locate(); ichZeigen(); map.setView([pos.lat, pos.lon], 13); }
    catch (ex) { $('#status').textContent = ex.message; }
    finally { btn.disabled = false; btn.textContent = '📍 Wo bin ich?'; }
  });
}
