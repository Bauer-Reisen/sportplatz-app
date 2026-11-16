// Platzsuche in der App, die kleine Tippfehler verzeiht („Anshausen“ findet „Arnshausen“).
// Groß/klein, Umlaute und Satzzeichen sind egal.

const norm = (s) => String(s || '').toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .replace(/[^a-z0-9]+/g, ' ').trim();

// Abstand zweier Wörter (wie viele Buchstaben falsch, fehlend oder zu viel)
function abstand(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  let vor = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const jetzt = [i];
    for (let j = 1; j <= b.length; j++) {
      jetzt[j] = Math.min(vor[j] + 1, jetzt[j - 1] + 1, vor[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    vor = jetzt;
  }
  return vor[b.length];
}

// Passt ein Suchwort zu einem Wort aus Verein/Ort?
function passt(q, wort) {
  if (wort.includes(q)) return 2;                       // genau drin
  const erlaubt = q.length >= 8 ? 2 : q.length >= 4 ? 1 : 0;
  if (!erlaubt) return 0;
  // auch den Wortanfang prüfen (wer noch tippt: „Arnsh“ → „arnshausen“)
  if (abstand(q, wort) <= erlaubt || abstand(q, wort.slice(0, q.length)) <= erlaubt - (q.length < 8 ? 0 : 1)) return 1;
  return 0;
}

// Liefert die passenden Plätze, beste Treffer zuerst.
export function platzSuche(plaetze, text) {
  const woerter = norm(text).split(' ').filter(Boolean);
  if (!woerter.length) return plaetze;
  const out = [];
  for (const p of plaetze) {
    const ziel = norm(`${p.verein} ${p.ort}`);
    const zielWoerter = ziel.split(' ');
    let punkte = 0;
    let alle = true;
    for (const q of woerter) {
      const best = zielWoerter.includes(q) ? 3 : ziel.includes(q) ? 2 : Math.max(0, ...zielWoerter.map((w) => passt(q, w)));
      if (!best) { alle = false; break; }
      punkte += best;
    }
    if (alle) out.push({ p, punkte });
  }
  return out.sort((a, b) => b.punkte - a.punkte).map((x) => x.p);
}
