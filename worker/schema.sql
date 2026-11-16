-- Aufbau der Datenbank „sportplatz“ (Cloudflare D1, Speicherort Westeuropa).
-- Kann gefahrlos mehrmals ausgeführt werden: legt nur an, was fehlt.
-- Online: npx wrangler d1 execute sportplatz --remote --file worker/schema.sql --config worker/wrangler.toml

-- Plätze. Lage auf 4 Nachkommastellen gerundet (ca. 10 m). Keine Personen, kein Gerät.
CREATE TABLE IF NOT EXISTS plaetze (
  id        TEXT PRIMARY KEY,
  verein    TEXT NOT NULL,
  ort       TEXT NOT NULL,
  lat       REAL NOT NULL,
  lon       REAL NOT NULL,
  angelegt  TEXT NOT NULL,          -- Datum JJJJ-MM-TT (vom Server)
  versteckt INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS plaetze_lage ON plaetze (lat, lon);
