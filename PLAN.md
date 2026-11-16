# Sportplatz-App „Halbzeit-Check“ – Plan

Stand: 16.11.2026 · Version 3 (geprüft: 5 Recherchen, kritische Prüfung, Abgleich mit Kochabend-, Film- und Bike-App) · **freigegeben, Bau läuft**

## 1. Urteil
Machbar: ja – kostenlos, schnell umsetzbar, mit denselben Bausteinen wie deine anderen Apps; du musst fast nichts einrichten. Einschränkung 1: Ohne Anmeldung kann man doppelte Bewertungen nur bremsen, nicht verhindern; im Freundeskreis reicht das. Einschränkung 2: Solange nur ihr den Link habt, bleibt es eine Freundeskreis-App; wer sie später für alle öffnet, braucht vorher Datenschutzerklärung, Impressum und mehr Schutz.

## 2. Gewählter Aufbau (einfach gesagt)
- **Wie deine anderen Apps:** Website auf GitHub, aufs iPhone mit „Zum Home-Bildschirm“, große Knöpfe, Leiste unten, Zahnrad oben für „Mehr“, Rundgang beim ersten Öffnen, „Was ist neu?“, Update kommt von selbst.
- **Leiste unten:** Liste · Karte · Bewerten.
- **Gemeinsame Bewertungen:** liegen bei **Cloudflare** (wie bei der Kochabend-App), Speicherort Europa. Konto und Zugang sind schon da, kein Einschlafen in der Sommerpause, keine Kosten.
- **Ohne Anmeldung:** Jedes Handy bekommt eine Zufallsnummer. Sie steht nicht bei der Bewertung, niemand kann sehen, wo ein Handy war.
- **Am Platz: „Wo bin ich?“** – ein Tipp, der nächste Platz steht oben. Der Standort bleibt im Handy. Ohne Standort: Suche nach Ort oder Verein.
- **Neue Plätze:** Fehlt einer, tippt dein Freund am Platz auf **„Platz fehlt – hier anlegen“** (Verein, Ort; die Lage nimmt die App vom Handy). Er ist sofort für alle da. Du kannst Plätze und Bewertungen über einen eigenen Verwaltungs-Code ausblenden.
- **Schlechtes Netz:** Die Bewertung wird sofort im Handy gespeichert („Gespeichert ✓“) und automatisch gesendet, sobald Netz da ist.
- **Verbreitung:** Link in eurer WhatsApp-Gruppe.

**Entscheidungen, wo Recherchen oder Pläne sich widersprachen:**
- Supabase / Firebase / Cloudflare → **Cloudflare**, weil es nicht einschläft, in Europa speichert und bei dir schon eingerichtet ist (Firebase hätte ein neues Google-Projekt mit vielen Klicks gebraucht).
- Freitext und Fotos → **weglassen**, weil sie das größte Haftungsrisiko sind.
- Sterne oder Schulnoten → **Sterne 1–5**, weil „5 = gut“ ohne Nachdenken klar ist.
- QR-Sticker → **ersetzt durch „Wo bin ich?“**, weil es genauso schnell ist und nichts gedruckt oder genehmigt werden muss.
- Plätze vorab von Hand oder unterwegs → **unterwegs anlegen**, weil dein Freund ohnehin vor Ort ist und du keine Liste vorbereiten musst.

## 3. Umfang Version 1
**Bewerten (unter 30 Sekunden, einhändig):**
1. „Wo bin ich?“ antippen oder Platz suchen
2. **Gesamt:** 1–5 Sterne (einzige Pflicht) – großer Knopf **Senden** unten
3. Zugeklappt unter „Mehr angeben“ (freiwillig): Bier · Essen · Preise · Stimmung (je Sterne) · „Was gibt es hier?“ als große Kacheln · Bierpreis mit Größe (0,5 l / 0,33 l)
4. „Gespeichert ✓“ + kurze Vibration, 10 Sekunden lang „Rückgängig“

**„Was gibt es hier?“ (10 Kacheln):** Fassbier · Alkoholfrei/Radler · Softdrinks · Kaffee · Schnaps/Aperol · Bratwurst · Currywurst/Pommes · Brötchen (Fleischkäse/Steak) · Kuchen · Kartenzahlung.

**Anzeigen:** Liste mit Gesamtnote, Anzahl, Ort, Entfernung · Platz-Seite mit Noten je Kriterium, was es gibt, typischem Bierpreis, „In Karten-App öffnen“ · Noten erst ab 3 Bewertungen · Karte.

**Schutz:** 1 Bewertung pro Handy, Platz und Tag · nur erlaubte Werte · Datum setzt der Server · niemand ändert oder löscht fremde Bewertungen · Bremse gegen Massen-Anfragen · nur deine Website darf die Datenbank benutzen · Melden-Knopf · Ausblenden mit Verwaltungs-Code · Notbremse „Bewerten aus“ · Sicherung.

**Bewusst später:** Datenschutzerklärung + Impressum (vor dem Öffnen für alle), QR-Sticker (als Werbung, wenn offen für alle), Freitext, Fotos, Anmeldung, „Meine Besuche“, Gebiete außerhalb Unterfrankens. Vereinslogos nie – nur Namen.

## 4. Bau in Abschnitten
Nach jedem Abschnitt: veröffentlichen, Link + 3–5 Testpunkte fürs iPhone, `STAND.md` aktualisieren, **auf dein Okay warten**.

1. **Grundgerüst online** – Name, Symbol, Leiste unten, Zahnrad mit „Mehr“, Rundgang, Hinweis „Zum Home-Bildschirm“, geht offline, Update kommt von selbst. – *Erkennbar:* Symbol liegt auf dem Home-Bildschirm, die App öffnet sich auch im Flugmodus.
2. **Plätze** – Datenbank, Liste, Suche, „Wo bin ich?“, „Platz fehlt – hier anlegen“, „In Karten-App öffnen“. – *Erkennbar:* Du legst zu Hause einen Test-Platz an, er steht bei „Wo bin ich?“ ganz oben und erscheint auch auf einem zweiten Handy.
3. **Bewerten** – Formular, Speichern im Handy, Senden, Noten in Liste und Platz-Seite, kurzer Datenschutz-Hinweis. – *Erkennbar:* Du bewertest, eine Freundin sieht es; eine zweite Bewertung am selben Tag wird freundlich abgelehnt.
4. **Alltagstauglich** – kein Netz, Melden, Verwaltung (Ausblenden, Notbremse), Sicherung. – *Erkennbar:* Im Flugmodus bewerten, App schließen, Flugmodus aus, App öffnen – die Bewertung erscheint.
   → **Danach Testlauf im Freundeskreis** (2–3 Spieltage), dann Nachbesserungen.
5. **Karte** – alle Plätze auf einer Karte, Farbe nach Note. – *Erkennbar:* Dein Test-Platz sitzt an der richtigen Stelle, Antippen öffnet ihn.

## 5. Was du selbst tust
**A) GitHub (für Abschnitt 1)** – mit deinem Konto Bauer-Reisen
1. github.com → oben rechts **+** → **New repository**
2. Repository name: `sportplatz-app` → **Public** → *nichts ankreuzen* → **Create repository**
3. Wenn ich Bescheid gebe: **Settings** → links **Pages** → Source: **Deploy from a branch** → Branch: **main**, Ordner **/docs** → **Save**

**B) Verwaltungs-Code (für Abschnitt 4)** – wie der Code bei der Kochabend-App
1. dash.cloudflare.com → **Workers & Pages** → `sportplatz` → **Settings** → **Variables and Secrets** → **Add**
2. Type **Secret**, Name `ADMIN_CODE`, Value: ein Code, den nur du kennst → **Deploy**

**C) Einmal im Monat:** Sicherung per Doppelklick starten (richte ich in Abschnitt 4 ein).

## 6. Offene Entscheidungen
1. **Name:** Arbeitstitel „Halbzeit-Check“ (lässt sich jederzeit ändern).
2. **Karte:** bleibt drin, als letzter Abschnitt.
3. **Impressum-Adresse:** erst vor dem Öffnen für alle nötig.

---
### Technik (für spätere Sitzungen – Nutzerin muss das nicht lesen)
- Aufbau wie `Documents\Kochabend-App`: `docs/` (GitHub Pages aus `/docs`), `worker/` (Cloudflare Worker `sportplatz` + D1 `sportplatz`, Ort weur), `scripts/` (`dev.js` Port 5810, `set-version.js`, `check-secrets.js`, `make-icons.js`). Module mit `?v=<Version>`, `version.json` + Auto-Update (`location.replace`, sessionStorage-Sperre). Hilfe-Muster: `tour.js` (Karten mit `stand`), `news.js` (jeder Eintrag nennt Karte oder „klein“), Wächter in `scripts/check-help.js`.
- Zusätzlich `docs/sw.js` wie Bike-App (Netz zuerst, max. 4 s, sonst Kopie) – wichtig am Platz.
- Wrangler: `NODE_USE_SYSTEM_CA=1 npx wrangler …` (AVG), Konto `film-app.workers.dev`. Erlaubte Herkunft: `https://bauer-reisen.github.io`, `http://localhost:5810`. Rate-Limit-Binding.
- D1: `plaetze` (id, verein, ort, lat, lon, angelegt, versteckt), `bewertungen` (id, platz, tag, gesamt, bier, essen, preise, stimmung, angebot JSON aus fester Liste, bierpreis 0–15, groesse aus Liste, versteckt; **keine Geräte-Nummer**), `sperren` (sha256(geraet+platz+tag), nicht abrufbar), `meldungen`, `einstellungen` (schreiben_erlaubt). Tag vom Server (Europe/Berlin). Kein update/delete über die öffentliche Schnittstelle; Verwaltung nur mit `ADMIN_CODE`.
- „Wo bin ich?“: `navigator.geolocation` nur auf Knopfdruck, Entfernung im Gerät. Platz anlegen: Lage auf 4 Nachkommastellen gerundet.
- Warteschlange in IndexedDB (wie Kochabend `photos.js`), Senden bei `online`/Öffnen.
- Karte: Leaflet in `docs/vendor/` + basemap.de Web Raster („© GeoBasis-DE / BKG (Jahr) CC BY 4.0“).
- Datenschutz: GitHub (USA), Cloudflare (Speicher EU, Firma USA, Data Privacy Framework), basemap.de. Kein Standort gespeichert außer Lage neuer Plätze, keine IP, kein Analyse-Werkzeug → kein Cookie-Banner.
- Gestaltung: dunkle Schrift auf Weiß (Sonne), Sterne ≥ 56 px, Tippflächen ≥ 48 px, nur Tippen, Wichtiges im unteren Drittel, keine Töne.
