// Rundgang beim allerersten Öffnen: ein paar Karten, jederzeit überspringbar.
// Unter dem Zahnrad („Rundgang ansehen“) wieder aufrufbar.
// `stand` = Version, in der die Karte zuletzt inhaltlich angepasst wurde (prüft scripts/check-help.js).
import { dialog } from './ui.js?v=0.2.1';

export const STEPS = [
  {
    id: 'idee', stand: '0.1.0', icon: '⚽', title: 'Was erwartet mich am Platz?',
    text: 'Mal ein Verkaufsfenster mit zwei Getränken, mal ein Sportheim mit Fassbier, Currywurst und Pommes. Hier seht ihr, <strong>was es wo gibt und wie gut es ist</strong>.',
  },
  {
    id: 'wo', stand: '0.2.1', icon: '📍', title: 'Wo bin ich?',
    text: 'Am Platz ein Tipp auf <strong>Wo bin ich?</strong>, und der nächste Platz steht ganz oben. Fehlt er noch, legst du ihn gleich an – vor Ort oder später von daheim auf der Karte.',
  },
  {
    id: 'bewerten', stand: '0.1.0', icon: '⭐', title: 'In 30 Sekunden bewertet',
    text: 'Ein Tipp für die <strong>Gesamt-Sterne</strong> reicht. Bier, Essen, Preise, Stimmung und was es gibt sind freiwillig. Geht auch mit einer Hand – die andere hält das Bier.',
  },
  {
    id: 'netz', stand: '0.1.0', icon: '📶', title: 'Kein Netz am Platz?',
    text: 'Macht nichts. Die Bewertung wird im Handy gespeichert und <strong>von selbst gesendet</strong>, sobald wieder Netz da ist.',
  },
  {
    id: 'home', stand: '0.1.0', icon: '🏠', title: 'Auf den Home-Bildschirm',
    text: 'Am iPhone: in Safari unten auf das <strong>Teilen-Symbol</strong> <span class="ios-share" aria-hidden="true"></span> und dann <strong>Zum Home-Bildschirm</strong>. Am Android-Handy im Menü <strong>⋮</strong> auf <strong>App installieren</strong>.',
  },
];

export async function runTour() {
  for (let i = 0; i < STEPS.length; i++) {
    const s = STEPS[i];
    const last = i === STEPS.length - 1;
    const res = await dialog({
      title: s.title,
      body: `
        <div class="tour">
          <div class="tour-icon" aria-hidden="true">${s.icon}</div>
          <p>${s.text}</p>
          <p class="tour-dots" aria-label="Schritt ${i + 1} von ${STEPS.length}">${STEPS.map((_, j) => `<span class="${j === i ? 'on' : ''}"></span>`).join('')}</p>
        </div>`,
      buttons: [
        { label: 'Überspringen', value: 'skip' },
        { label: last ? 'Los geht’s' : 'Weiter', value: 'next', primary: true },
      ],
    });
    if (!res || res.value !== 'next') return;
  }
}
