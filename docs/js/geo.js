// Standort – nur auf Knopfdruck, nur im Handy. Wird nicht gespeichert und nicht verschickt
// (außer als Lage eines neu angelegten Platzes).
import { isIos } from './install.js?v=0.4.3';

// Letzte Position nur im Arbeitsspeicher (weg, sobald die App geschlossen wird)
export const pos = { lat: null, lon: null, acc: null, zeit: 0 };
export const posFrisch = () => pos.lat != null && Date.now() - pos.zeit < 5 * 60_000;

export function locate() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Dieses Handy kann den Standort nicht bestimmen. Such den Platz einfach über die Suche.'));
    navigator.geolocation.getCurrentPosition(
      (p) => {
        Object.assign(pos, { lat: p.coords.latitude, lon: p.coords.longitude, acc: Math.round(p.coords.accuracy), zeit: Date.now() });
        resolve(pos);
      },
      (err) => {
        if (err.code === 1) {
          reject(new Error(isIos()
            ? 'Der Standort ist gesperrt. Am iPhone: Einstellungen → Datenschutz & Sicherheit → Ortungsdienste → Safari-Websites → „Beim Verwenden der App“. Oder such den Platz über die Suche.'
            : 'Der Standort ist gesperrt. Erlaube ihn in den Einstellungen des Browsers – oder such den Platz über die Suche.'));
        } else {
          reject(new Error('Der Standort ließ sich gerade nicht bestimmen. Nochmal versuchen – oder über die Suche.'));
        }
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  });
}

export function meters(a1, o1, a2, o2) {
  const R = 6371000; const r = Math.PI / 180;
  const x = (o2 - o1) * r * Math.cos(((a1 + a2) / 2) * r);
  const y = (a2 - a1) * r;
  return Math.round(Math.hypot(x, y) * R);
}

export const fmtDist = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(m < 10_000 ? 1 : 0).replace('.', ',')} km`);

// Link zur Karten-App des Handys
export function mapsLink(p) {
  return isIos()
    ? `https://maps.apple.com/?ll=${p.lat},${p.lon}&q=${encodeURIComponent(p.verein)}`
    : `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`;
}
