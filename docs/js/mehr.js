// Seite „Mehr“ (Zahnrad oben): Rundgang, Neuigkeiten, Home-Bildschirm, Version.
import { VERSION, APP_NAME } from './config.js?v=0.2.1';
import { installCard } from './install.js?v=0.2.1';
import { runTour } from './tour.js?v=0.2.1';
import { NEWS, showNews } from './news.js?v=0.2.1';

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
        <p class="small">Die App speichert keinen Namen, kein Konto und keinen Standort. Im Handy merkt sie sich nur Kleinigkeiten, z.&nbsp;B. ob du den Rundgang schon gesehen hast.</p>
      </div>
      <footer class="foot">
        <p class="muted small">${APP_NAME} · Version ${VERSION}</p>
      </footer>
    </section>`;
  view.querySelector('[data-act=tour]').addEventListener('click', () => runTour());
  view.querySelector('[data-act=news]')?.addEventListener('click', () => showNews(NEWS));
}
