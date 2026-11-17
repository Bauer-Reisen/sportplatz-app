// Hinweis „Auf den Home-Bildschirm“ – nur im Browser, nicht in der installierten App.
import { store } from './store.js?v=0.4.3';

export const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const text = () => (isIos()
  ? '<p>In Safari unten auf das <strong>Teilen-Symbol</strong> <span class="ios-share" aria-hidden="true"></span> tippen, dann <strong>„Zum Home-Bildschirm“</strong>.</p>'
  : '<p>Im Browser-Menü <strong>⋮</strong> auf <strong>„App installieren“</strong> oder <strong>„Zum Startbildschirm hinzufügen“</strong> tippen.</p>');

// Immer zeigen (unter „Mehr“)
export const installCard = () => (standalone() ? '' : `
  <div class="card install">
    <h3>Als App auf den Home-Bildschirm</h3>
    ${text()}
  </div>`);

// Auf der Startseite, bis man es wegklickt
export function installBanner() {
  if (standalone() || store.get('installHidden')) return '';
  return `
    <div class="card install" id="install">
      <button type="button" class="link close" data-act="install-hide" aria-label="Hinweis ausblenden">✕</button>
      <h3>Tipp: als App speichern</h3>
      ${text()}
    </div>`;
}

export function wireInstall(view) {
  view.querySelector('[data-act=install-hide]')?.addEventListener('click', () => {
    store.set('installHidden', '1');
    view.querySelector('#install')?.remove();
  });
}
