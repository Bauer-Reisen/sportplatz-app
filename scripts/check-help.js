// Wächter für die Hilfe: Bleibt der Rundgang aktuell?
// Jeder „Was ist neu?“-Eintrag nennt die Rundgang-Karte, die ihn erklärt (oder 'klein'),
// und diese Karte muss mindestens auf dem Stand dieser Version sein.
// Prüft außerdem, dass alle Versionsnummern zusammenpassen und sw.js alle Seiten kennt.
import { readFileSync, readdirSync } from 'node:fs';

const read = (f) => readFileSync(f, 'utf8');
const num = (v) => v.split('.').map(Number);
const geq = (a, b) => { const x = num(a); const y = num(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return true; };

// Die Hilfedateien als Module laden (sie importieren ui.js, das im Browser läuft – daher nur Text auslesen)
const tour = read('docs/js/tour.js');
const news = read('docs/js/news.js');
const cards = Object.fromEntries([...tour.matchAll(/id: '([\w-]+)', stand: '([\d.]+)'/g)].map((m) => [m[1], m[2]]));
const entries = [...news.replace(/\/\/.*$/gm, '').matchAll(/v: '([\d.]+)', karte: '([\w-]+)'/g)].map((m) => ({ v: m[1], karte: m[2] }));
const allNews = [...news.replace(/\/\/.*$/gm, '').matchAll(/\bv: '([\d.]+)'/g)].length;

const errs = [];
if (!Object.keys(cards).length) errs.push('Rundgang: keine Karten mit id und stand gefunden');
if (allNews !== entries.length) errs.push('„Was ist neu?“: jeder Eintrag braucht direkt hinter v: auch karte: (Karten-Name oder \'klein\')');
for (const e of entries) {
  if (e.karte === 'klein') continue;
  if (!cards[e.karte]) errs.push(`„Was ist neu?“ ${e.v}: Rundgang-Karte „${e.karte}“ gibt es nicht`);
  else if (!geq(cards[e.karte], e.v)) errs.push(`Rundgang-Karte „${e.karte}“ hat Stand ${cards[e.karte]}, muss aber mindestens ${e.v} sein`);
}

// Versionen
const v = read('docs/js/config.js').match(/VERSION = '([^']+)'/)[1];
const vs = {
  'docs/sw.js': read('docs/sw.js').match(/VERSION = '([^']+)'/)[1],
  'docs/version.json': JSON.parse(read('docs/version.json')).version,
  'package.json': JSON.parse(read('package.json')).version,
};
for (const [f, x] of Object.entries(vs)) if (x !== v) errs.push(`${f} hat Version ${x}, config.js hat ${v}`);

// sw.js muss alle Dateien in docs/js kennen
const sw = read('docs/sw.js');
for (const f of readdirSync('docs/js').filter((f) => f.endsWith('.js'))) {
  if (!sw.includes(`'js/${f}'`)) errs.push(`sw.js: js/${f} fehlt in der Liste (sonst offline nicht da)`);
}

if (errs.length) {
  console.error('\n✋ Hilfe/Versionen nicht in Ordnung:\n   ' + errs.join('\n   ') + '\n');
  process.exit(1);
}
console.log(`✓ Rundgang (${Object.keys(cards).length} Karten), Neuigkeiten (${entries.length}) und Version ${v} passen zusammen.`);
