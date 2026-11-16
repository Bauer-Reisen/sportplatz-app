// Seite „Liste“: alle Plätze. In Abschnitt 2 kommen Datenbank, Suche und „Wo bin ich?“.
import { installBanner, wireInstall } from './install.js?v=0.1.0';

export function render(view) {
  view.innerHTML = `
    <section>
      ${installBanner()}
      <h1>Plätze</h1>
      <p class="lead">Was gibt es am Sportplatz – und wie gut ist es?</p>
      <button type="button" class="btn btn-primary btn-wide btn-big" disabled>📍 Wo bin ich?</button>
      <div class="card soon" style="margin-top:16px">
        <span class="tag">Kommt als Nächstes</span>
        <p>Hier stehen bald alle Plätze mit ihrer Note. Mit <strong>Wo bin ich?</strong> findest du den Platz, an dem du gerade stehst – und fehlt er, legst du ihn gleich an.</p>
      </div>
    </section>`;
  wireInstall(view);
}
