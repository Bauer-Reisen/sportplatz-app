// Erzeugt die App-Symbole als PNG (ohne Zusatzpakete). Aufruf: npm run icons
// Motiv: weißer Stern auf Rasengrün mit einer weißen Mittellinie wie auf dem Spielfeld.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0x1c, 0x6b, 0x35];
const FG = [0xff, 0xff, 0xff];

// Punkt in Vieleck (Stern)?
const STAR = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 ? 78 : 178;
  const a = -Math.PI / 2 + (i * Math.PI) / 5;
  return [256 + r * Math.cos(a), 262 + r * Math.sin(a)];
});
function inPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]; const [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function isFg(x, y) {
  if (inPoly(x, y, STAR)) return true;
  const d = Math.hypot(x - 256, y - 256);
  if (d >= 214 && d <= 228) return true;            // Mittelkreis
  if (Math.abs(y - 256) <= 7 && (x < 60 || x > 452)) return true; // Mittellinie außen
  return false;
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function png(size, padding = 0) {
  const SS = 3; // Kantenglättung
  const raw = Buffer.alloc((size * 3 + 1) * size);
  const scale = (512 + 2 * padding) / size;
  for (let py = 0; py < size; py++) {
    raw[py * (size * 3 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const x = (px + (sx + 0.5) / SS) * scale - padding;
        const y = (py + (sy + 0.5) / SS) * scale - padding;
        if (isFg(x, y)) hits++;
      }
      const a = hits / (SS * SS);
      const o = py * (size * 3 + 1) + 1 + px * 3;
      for (let i = 0; i < 3; i++) raw[o + i] = Math.round(BG[i] * (1 - a) + FG[i] * a);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const dir = new URL('../docs/icons/', import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(new URL('apple-touch-icon.png', dir), png(180));
writeFileSync(new URL('icon-192.png', dir), png(192));
writeFileSync(new URL('icon-512.png', dir), png(512));
writeFileSync(new URL('icon-maskable-512.png', dir), png(512, 90)); // mit Rand für Android-Formen
console.log('Symbole erstellt in docs/icons/');
