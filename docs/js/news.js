// „Was ist neu?“ – nach einem Update einmal, wenn man die App wieder öffnet.
// Wer die App neu hat, bekommt stattdessen den Rundgang.
// Neueste zuerst; nur Änderungen, die man sieht und kennen sollte (keine Reparaturen).
// Jeder Eintrag nennt in `karte` die Rundgang-Karte, die ihn erklärt, oder 'klein' (prüft scripts/check-help.js).
import { dialog } from './ui.js?v=0.2.0';

export const NEWS = [
  {
    v: '0.2.0', karte: 'wo', title: 'Die Plätze sind da',
    items: [
      'Tippe am Platz auf <strong>📍 Wo bin ich?</strong> – der nächste Platz steht ganz oben.',
      'Fehlt er noch: <strong>➕ Platz fehlt – hier anlegen</strong>. Verein und Ort eintippen, die Lage nimmt die App vom Handy.',
      'Über die <strong>Suche</strong> findest du jeden Platz auch von daheim, und <strong>In Karten-App öffnen</strong> zeigt dir den Weg.',
    ],
  },
];

const num = (v) => (v || '0').split('.').map(Number);
export const newer = (a, b) => { const x = num(a); const y = num(b); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };

export const unseen = (seen) => NEWS.filter((n) => !seen || newer(n.v, seen));

export async function showNews(list) {
  await dialog({
    title: 'Was ist neu?',
    body: `<div class="news">${list.map((n) => `<h3>${n.title}</h3><ul>${n.items.map((t) => `<li>${t}</li>`).join('')}</ul>`).join('')}</div>`,
    buttons: [{ label: 'Alles klar', value: true, primary: true }],
  });
}
