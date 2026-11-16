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

-- Bewertungen und reine Angebots-Einträge. KEINE Geräte-Nummer.
CREATE TABLE IF NOT EXISTS bewertungen (
  id        TEXT PRIMARY KEY,       -- vom Handy erzeugt (damit doppeltes Senden nichts doppelt anlegt)
  platz     TEXT NOT NULL,
  tag       TEXT NOT NULL,          -- Datum des Eintrags (vom Server)
  besuch    TEXT NOT NULL,          -- 'heute' | 'kuerzlich'
  art       TEXT NOT NULL,          -- 'bewertung' | 'angebot'
  gesamt    INTEGER, bier INTEGER, essen INTEGER, preise INTEGER, stimmung INTEGER,  -- 1–5 oder leer
  angebot   TEXT NOT NULL DEFAULT '{}',  -- {"fassbier":1,"currywurst":0,…} nur was angegeben wurde
  bierpreis REAL,                   -- Euro
  groesse   TEXT,                   -- '0,5' | '0,33'
  versteckt INTEGER NOT NULL DEFAULT 0,  -- 1 = ausgeblendet (gemeldet oder von der Verwaltung)
  meldungen INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS bewertungen_platz ON bewertungen (platz, tag);

-- Sperre „1 Eintrag pro Handy, Platz und Tag“: nur ein Prüfwert (nicht zurückrechenbar), nie abrufbar.
CREATE TABLE IF NOT EXISTS sperren (
  schluessel TEXT PRIMARY KEY,
  tag        TEXT NOT NULL
);

-- Meldungen: je Handy und Bewertung nur einmal (Prüfwert statt Geräte-Nummer)
CREATE TABLE IF NOT EXISTS meldungen (
  bewertung  TEXT NOT NULL,
  schluessel TEXT NOT NULL,
  grund      TEXT NOT NULL,
  tag        TEXT NOT NULL,
  PRIMARY KEY (bewertung, schluessel)
);

-- Einstellungen (z. B. Notbremse „schreiben_erlaubt“) und „Angebot zurücksetzen“ je Platz
CREATE TABLE IF NOT EXISTS einstellungen (
  name TEXT PRIMARY KEY,
  wert TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS angebot_ab (
  platz TEXT PRIMARY KEY,
  tag   TEXT NOT NULL             -- ältere Angebots-Angaben zählen für diesen Platz nicht mehr
);
