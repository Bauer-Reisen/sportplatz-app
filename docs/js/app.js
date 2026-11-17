// Einstieg der App: Seitenwechsel, Rundgang beim ersten Öffnen, „Was ist neu?“, Updates, Offline.
import { VERSION } from './config.js?v=0.4.7';
import { store } from './store.js?v=0.4.7';
import { toast } from './ui.js?v=0.4.7';
import { renderTabs } from './tabs.js?v=0.4.7';
import { runTour } from './tour.js?v=0.4.7';
import { unseen, showNews, NEWS } from './news.js?v=0.4.7';
import { senderStarten } from './senden.js?v=0.4.7';

const view = document.getElementById('view');

// Jede Seite ist eine eigene Datei und wird erst beim Öffnen geladen.
const PAGES = {
  liste: () => import('./liste.js?v=0.4.7'),
  karte: () => import('./karte.js?v=0.4.7'),
  bewerten: () => import('./bewerten.js?v=0.4.7'),
  mehr: () => import('./mehr.js?v=0.4.7'),
  platz: () => import('./platz.js?v=0.4.7'),
  neu: () => import('./neu.js?v=0.4.7'),
  verwaltung: () => import('./verwaltung.js?v=0.4.7'),
  meine: () => import('./meine.js?v=0.4.7'),
};
// Unterseiten gehören zu diesem Reiter
const TAB_OF = { platz: 'liste', neu: 'liste', verwaltung: 'mehr', meine: 'liste' };

async function route() {
  const [, page = '', ...rest] = (location.hash || '#/').split('/');
  const name = PAGES[page] ? page : 'liste';
  renderTabs(TAB_OF[name] || name);
  // Jede Seite bekommt einen eigenen Rahmen. Lädt eine alte Seite noch nach, schreibt sie ins Leere.
  const box = document.createElement('div');
  box.className = 'seite';
  try {
    const mod = await PAGES[name]();
    view.replaceChildren(box);
    await mod.render(box, ...rest.map(decodeURIComponent));
  } catch (ex) {
    console.error(ex);
    if (!box.isConnected) return; // inzwischen andere Seite offen
    box.innerHTML = `
      <section class="center" style="margin-top:20vh">
        <h1>Das hat nicht geklappt</h1>
        <p class="lead">Vielleicht gerade kein Netz?</p>
        <button type="button" class="btn btn-primary" id="retry">Nochmal versuchen</button>
      </section>`;
    box.querySelector('#retry').addEventListener('click', route);
  }
}

// Ein Eintrag ist raus (oder zurückgenommen): betroffene Seite neu zeichnen
addEventListener('halbzeit:gesendet', (e) => {
  const h = location.hash || '#/';
  if (h === `#/platz/${e.detail}` || h === '#/' || h === '#/karte') route();
});

addEventListener('hashchange', () => { document.getElementById('scroller').scrollTo(0, 0); route(); });

// Rundgang, solange er nicht bis zum Ende angesehen oder bewusst übersprungen wurde.
async function helpOnStart() {
  if (!store.get('tourSeen')) {
    await runTour();
    store.set('tourSeen', '1');
    store.set('newsSeen', NEWS[0]?.v || VERSION);
    return;
  }
  const list = unseen(store.get('newsSeen'));
  if (list.length) {
    await showNews(list);
    store.set('newsSeen', NEWS[0].v);
  }
}

// ---------- Update-Prüfung (wie Film- und Kochabend-App) ----------
async function checkForUpdate() {
  if (location.hostname === 'localhost') return;
  try {
    const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    const { version } = await res.json();
    if (!version || version === VERSION) return;
    const key = 'halbzeit.reloadedFor';
    if (sessionStorage.getItem(key) === version) return; // nie endlos neu laden
    sessionStorage.setItem(key, version);
    location.replace(`${location.pathname}?v=${version}${location.hash}`);
  } catch { /* offline – egal */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkForUpdate();
});

// ---------- Offline (Service Worker wie Bike-App) ----------
if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* ohne geht es auch */ });
}

checkForUpdate();
senderStarten();
route().then(helpOnStart).catch((ex) => { console.error(ex); toast('Da ist etwas schiefgelaufen.'); });
