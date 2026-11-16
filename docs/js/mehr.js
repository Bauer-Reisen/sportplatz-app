// Seite „Mehr“ (Zahnrad oben): Rundgang, Neuigkeiten, Home-Bildschirm, Version.
import { VERSION, APP_NAME } from './config.js?v=0.4.0';
import { installCard } from './install.js?v=0.4.0';
import { runTour } from './tour.js?v=0.4.0';
import { NEWS, showNews } from './news.js?v=0.4.0';

export function render(view) {
  view.innerHTML = `
    <section>
      <h1>Mehr</h1>
      ${installCard()}
      <div class="card">
        <h3>Hilfe</h3>
        <button type="button" class="btn btn-wide" data-act="tour">Rundgang ansehen</button>
        ${NEWS.length ? '<button type="button" class="btn btn-wide" style="margin-top:10px" data-act="news">Was ist neu?</button>' : ''}
      </div>
      <div class="card card-soft">
        <h3>Deine Daten</h3>
        <ul class="small daten">
          <li><strong>Kein Konto, kein Name, keine E-Mail.</strong> Bewertungen sind anonym.</li>
          <li><strong>Standort</strong> nur, wenn du „Wo bin ich?“ tippst – er bleibt im Handy und wird nicht gespeichert. Gespeichert wird nur die Lage des Sportplatzes.</li>
          <li>Dein Handy bekommt eine <strong>Zufallsnummer</strong>, damit pro Platz nur ein Eintrag am Tag geht. Der Server merkt sich davon nur einen Prüfwert, aus dem man nichts zurückrechnen kann.</li>
          <li><strong>Ortssuche:</strong> Der Suchtext geht an komoot (Photon) bzw. OpenStreetMap. <strong>Karte:</strong> Kartenbilder vom Bundesamt für Kartographie (BKG).</li>
          <li><strong>Meine Plätze</strong> liegt nur auf deinem Handy.</li>
          <li>Die Vereinsliste stammt aus OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL) und steckt in der App – beim Suchen geht nichts ins Netz. „Wann ist hier Spiel?“ öffnet fussball.de.</li>
          <li>Die App liegt bei GitHub, die Bewertungen bei Cloudflare in Westeuropa.</li>
        </ul>
      </div>
      <footer class="foot">
        <p class="muted small">${APP_NAME} · Version ${VERSION}</p>
        <a class="link small muted" href="#/verwaltung">Verwaltung</a>
      </footer>
    </section>`;
  view.querySelector('[data-act=tour]').addEventListener('click', () => runTour());
  view.querySelector('[data-act=news]')?.addEventListener('click', () => showNews(NEWS));
}
