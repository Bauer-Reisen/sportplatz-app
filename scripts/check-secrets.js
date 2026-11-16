// Prüft vor dem Hochladen, dass nichts Geheimes im Repository landet.
// Aufruf: npm run check-secrets. Findet es etwas, bricht es ab.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' })
  .split('\n').filter(Boolean).filter((f) => !/\.(png|jpg|jpeg|ico|gif|webp|woff2)$/i.test(f));

const hits = [];
for (const f of files) {
  if (/(^|\/)\.dev\.vars$/.test(f)) hits.push(`${f}  →  Datei mit Test-Code darf nicht hoch`);
  let text; try { text = readFileSync(f, 'utf8'); } catch { continue; }
  text.split('\n').forEach((line, i) => {
    if (/ADMIN_CODE\s*=\s*\S/.test(line) && !/^\s*#/.test(line)) hits.push(`${f}:${i + 1}  →  Verwaltungs-Code im Text`);
    if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(line)) hits.push(`${f}:${i + 1}  →  privater Schlüssel`);
  });
}
if (hits.length) {
  console.error('\n✋ Möglicherweise Geheimes gefunden – bitte nicht hochladen:\n   ' + hits.join('\n   ') + '\n');
  process.exit(1);
}
console.log('✓ Nichts Geheimes gefunden.');

const version = readFileSync('docs/js/config.js', 'utf8').match(/VERSION = '([^']+)'/)[1];
const wrong = [];
for (const f of files.filter((f) => /^docs\/js\/.+\.js$/.test(f))) {
  for (const m of readFileSync(f, 'utf8').matchAll(/(?:from |import\()'(\.\/[^']+)'/g)) {
    if (!m[1].endsWith(`?v=${version}`)) wrong.push(`${f}: ${m[1]}`);
  }
}
if (wrong.length) { console.error(`\n✋ Importe ohne Version ${version}:\n   ${wrong.join('\n   ')}\n`); process.exit(1); }
console.log(`✓ Alle Importe tragen Version ${version}.`);
