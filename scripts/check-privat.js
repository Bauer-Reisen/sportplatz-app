// Prüft vor jedem Hochladen, dass nichts Privates im Repository landet.
// Läuft automatisch vor `git push`. Findet es etwas, wird NICHT hochgeladen.
//
// Eigene Suchwörter (Nachnamen, Straßen, Wohnorte) stehen in der Datei
// `.privat-woerter.txt` (ein Wort pro Zeile). Diese Datei wird selbst nie hochgeladen.

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const MUSTER = [
  { name: 'E-Mail-Adresse', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, ausser: /noreply|example\.|@users\.noreply/ },
  { name: 'Schlüssel/Token', re: /(api[_-]?key|secret|token|passwor[dt])\s*[:=]\s*['"][^'"]{8,}/i },
  { name: 'Langer Schlüssel (eyJ…)', re: /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/ },
];

const woerter = existsSync('.privat-woerter.txt')
  ? readFileSync('.privat-woerter.txt', 'utf8').split(/\r?\n/).map(w => w.trim()).filter(w => w && !w.startsWith('#'))
  : [];

const dateien = execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' })
  .split('\n').filter(Boolean)
  .filter(f => !/\.(png|jpg|jpeg|ico|gif|webp)$/i.test(f))
  .filter(f => !f.startsWith('docs/vendor/'));

const treffer = [];
for (const datei of dateien) {
  let text;
  try { text = readFileSync(datei, 'utf8'); } catch { continue; }
  text.split('\n').forEach((zeile, i) => {
    for (const m of MUSTER) {

      if (m.re.test(zeile) && !(m.ausser && m.ausser.test(zeile))) treffer.push(`${datei}:${i + 1}  →  ${m.name}`);
    }
    for (const w of woerter) {
      if (zeile.toLowerCase().includes(w.toLowerCase())) treffer.push(`${datei}:${i + 1}  →  privates Wort aus der Liste`);
    }
  });
}

if (treffer.length) {
  console.error('\n✋ Achtung: Möglicherweise Privates gefunden – es wird nichts hochgeladen.\n');
  treffer.forEach(t => console.error('   ' + t));
  process.exit(1);
}
console.log(`✓ Nichts Privates gefunden (${dateien.length} Dateien, ${woerter.length} eigene Suchwörter).`);
