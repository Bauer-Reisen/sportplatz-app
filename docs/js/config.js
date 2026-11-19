// Feste Einstellungen der App. Version wird mit scripts/set-version.js gesetzt.
export const VERSION = '0.4.8';
export const APP_NAME = 'Halbzeit-Check';

// Adresse der gemeinsamen Datenbank (Cloudflare Worker). Beim Testen am PC der lokale Worker.
export const API = location.hostname === 'localhost' ? 'http://localhost:8788' : 'https://sportplatz.film-app.workers.dev';

// Wie nah muss ein Platz sein, damit „Wo bin ich?“ ihn als „Du bist hier“ zeigt?
export const HIER_METER = 400;
