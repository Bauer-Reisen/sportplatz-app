// „Was ist neu?“ – nach einem Update einmal, wenn man die App wieder öffnet.
// Wer die App neu hat, bekommt stattdessen den Rundgang.
// Neueste zuerst; nur Änderungen, die man sieht und kennen sollte (keine Reparaturen).
// Jeder Eintrag nennt in `karte` die Rundgang-Karte, die ihn erklärt, oder 'klein' (prüft scripts/check-help.js).
import { dialog } from './ui.js?v=0.4.7';

export const NEWS = [
  {
    v: '0.4.6', karte: 'klein', title: 'App weitergeben',
    items: ['Oben rechts unter ⚙️ <strong>Mehr</strong> gibt es jetzt einen <strong>QR-Code</strong>: Freunde scannen ihn mit der Kamera und haben die App.'],
  },
  {
    v: '0.4.2', karte: 'klein', title: 'Pommes!',
    items: ['Bei „Was gibt es hier?“ gibt es jetzt auch <strong>🍟 Pommes</strong>.'],
  },
  {
    v: '0.4.1', karte: 'bewerten', title: 'Sterne zum Ziehen',
    items: [
      'Die Sterne sind jetzt ein <strong>Schieberegler</strong>: mit dem Finger ziehen, auch Teil-Sterne wie 3,7.',
      '<strong>Wann warst du da?</strong> In den letzten 3 Monaten oder länger her – so kannst du auch Plätze von früher bewerten.',
      'Neu bei „Was gibt es hier?“: <strong>🍽️ Warme Küche</strong> und <strong>📺 Fußball im TV</strong>.',
    ],
  },
  {
    v: '0.4.0', karte: 'wo', title: 'Fast alle Plätze schon drin',
    items: [
      'Die App kennt jetzt fast alle Fußballplätze in Unterfranken. Einfach suchen – auch mit Tippfehler – und <strong>mit einem Tipp anlegen</strong>.',
      'Auch <strong>Wo bin ich?</strong> erkennt den Platz, wenn ihn noch niemand angelegt hat.',
    ],
  },
  {
    v: '0.4.0', karte: 'meine', title: 'Meine Plätze 🏟️',
    items: ['Dein Stempelheft: Jeder bewertete Platz kommt dazu. Zu finden oben in der Liste.'],
  },
  {
    v: '0.4.0', karte: 'klein', title: 'Wann ist hier Spiel?',
    items: ['Auf jeder Platzseite: ein Tipp öffnet den Spielplan des Vereins auf fussball.de.'],
  },
  {
    v: '0.3.1', karte: 'karte', title: 'Noten ab der ersten Bewertung',
    items: ['Die Sterne stehen jetzt schon ab der <strong>ersten Bewertung</strong> da. Bei weniger als 3 steht dabei: „Erst wenige Bewertungen“ – auf der Karte ist der Punkt dann blass.'],
  },
  {
    v: '0.3.0', karte: 'bewerten', title: 'Jetzt wird bewertet ⭐',
    items: [
      'Unten auf <strong>Bewerten</strong> oder auf einer Platzseite <strong>⭐ Jetzt bewerten</strong>. Gesamt-Sterne reichen.',
      'Kein Netz? Die Bewertung wartet im Handy und geht von selbst raus. 5 Sekunden lang kannst du sie noch <strong>rückgängig</strong> machen.',
    ],
  },
  {
    v: '0.3.0', karte: 'angebot', title: 'Was gibt es wo?',
    items: [
      'Jede Platzseite zeigt jetzt, was es gibt: <strong>✓</strong>, <strong>✗</strong> oder <strong>?</strong> bei widersprüchlichen Angaben – dazu den Bierpreis.',
      'Stimmt ein Eintrag nicht? Auf <strong>Melden</strong> tippen. Ab 3 Meldungen wird er ausgeblendet.',
    ],
  },
  {
    v: '0.3.0', karte: 'karte', title: 'Die Karte ist da',
    items: ['Alle Plätze auf einen Blick, farbig nach Note.'],
  },
  {
    v: '0.2.1', karte: 'wo', title: 'Plätze auch von daheim anlegen',
    items: [
      'Beim Anlegen wählst du jetzt: <strong>📍 Ich bin gerade dort</strong> oder <strong>🗺️ Auf der Karte zeigen</strong>. Ort suchen, auf den Sportplatz tippen – fertig.',
    ],
  },
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
