// Rundgang beim allerersten Öffnen: ein paar Karten, jederzeit überspringbar.
// Unter dem Zahnrad („Rundgang ansehen“) wieder aufrufbar.
// `stand` = Version, in der die Karte zuletzt inhaltlich angepasst wurde (prüft scripts/check-help.js).
import { dialog } from './ui.js?v=0.4.3';

export const STEPS = [
  {
    id: 'idee', stand: '0.1.0', icon: '⚽', title: 'Was erwartet mich am Platz?',
    text: 'Mal ein Verkaufsfenster mit zwei Getränken, mal ein Sportheim mit Fassbier, Currywurst und Pommes. Hier seht ihr, <strong>was es wo gibt und wie gut es ist</strong>.',
  },
  {
    id: 'wo', stand: '0.4.0', icon: '📍', title: 'Wo bin ich?',
    text: 'Am Platz ein Tipp auf <strong>Wo bin ich?</strong>, und der nächste Platz steht ganz oben. Die App kennt fast alle Fußballplätze in Unterfranken – fehlt einer noch, legst du ihn <strong>mit einem Tipp</strong> an.',
  },
  {
    id: 'bewerten', stand: '0.4.1', icon: '⭐', title: 'In 30 Sekunden bewertet',
    text: 'Unten auf <strong>Bewerten</strong>, Platz wählen, die <strong>Sterne</strong> mit dem Finger ziehen – auch halbe oder dreiviertel Sterne –, Senden, fertig. Bier, Essen, Preise und Stimmung sind freiwillig. Kennst du den Platz von früher? Dann „Länger her“ wählen.',
  },
  {
    id: 'angebot', stand: '0.3.0', icon: '🌭', title: 'Was gibt es hier?',
    text: 'Unter „Mehr angeben“ tippst du an, was es gibt: <strong>✓</strong> gibt es, <strong>✗</strong> gibt es nicht. Es zählen die letzten 5 Angaben – widersprechen sie sich, steht da <strong>?</strong>. Wer nur das Angebot kennt (z. B. der Wirt), nimmt <strong>Nur Angebot eintragen</strong>.',
  },
  {
    id: 'karte', stand: '0.3.1', icon: '🗺️', title: 'Alle Plätze auf der Karte',
    text: 'Unter <strong>Karte</strong> siehst du alle Plätze: <strong>grün</strong> ab 4 Sternen, <strong>gelb</strong> ab 3, <strong>rot</strong> darunter, <strong>blass</strong> = erst wenige Bewertungen, <strong>grau</strong> = noch keine.',
  },
  {
    id: 'meine', stand: '0.4.0', icon: '🏟️', title: 'Meine Plätze',
    text: 'Jeder Platz, den du bewertest, landet in deinem Stempelheft <strong>Meine Plätze</strong>. Wie viele schaffst du in der Saison? Bleibt nur auf deinem Handy.',
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
