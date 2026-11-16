# Halbzeit-Check (Sportplatz-App) – Stand

**Worum es geht:** Bewertungs-App für Sportheime und Verkaufsstände an Amateur-Fußballplätzen (Start: Freundeskreis, Unterfranken). Plan: `PLAN.md` (Version 3, freigegeben 16.11.2026). Aufbau wie Kochabend-App (`docs/`, `scripts/`, später `worker/`) + Offline wie Bike-App (`docs/sw.js`).

**Regeln:** Deutsch, knapp, nichts Technisches erklären – nur sagen, was die Nutzerin testen oder liefern soll. Keine Konten anlegen, keine Passwörter eingeben, keine Zugangsdaten oder Namen/Adressen im Repository. Nach jedem Abschnitt: veröffentlichen, Link + 3–5 Testpunkte fürs iPhone, diese Datei aktualisieren, **auf Okay warten**. Hilfe-Muster (Rundgang, „Was ist neu?“) bei jeder sichtbaren Neuerung mitpflegen.

## Eingerichtet
- Ordner `C:\Users\Steffi\Documents\Sportplatz-App`, Git lokal (Branch `main`, Autor wie Bike-App), Remote `https://github.com/Bauer-Reisen/sportplatz-app.git` eingetragen – Repository angelegt und Pages eingeschaltet (Branch main, Ordner /docs) am 16.11.2026. Adresse: https://bauer-reisen.github.io/sportplatz-app/
- Vor jedem `git push` läuft `npm run check` (Hook in `.githooks/`): nichts Geheimes, nichts Privates (eigene Suchwörter in `.privat-woerter.txt`, nicht im Repo), Rundgang/Neuigkeiten/Versionen passen, `sw.js` kennt alle JS-Dateien.
- Lokal testen: Vorschau `sportplatz` in `Uebergabe-App\.claude\launch.json` (Port 5810). Service Worker läuft auf localhost absichtlich nicht.
- Neue Version: `node scripts/set-version.js 0.x.0` (setzt config.js, sw.js, version.json, package.json, alle `?v=`).
- Cloudflare: Wrangler ist angemeldet (Konto der Film-/Kochabend-App), Befehle mit `NODE_USE_SYSTEM_CA=1 npx wrangler …`.

## Abschnitte
- [x] **1 – Grundgerüst** (16.11.2026, Version 0.1.0, lokal geprüft bei 375 px): Kopfzeile mit Zahnrad → „Mehr“ (Home-Bildschirm-Hinweis, Rundgang, Datenhinweis, Version), Leiste Liste · Karte · Bewerten (Platzhalter), Rundgang 5 Karten, „Was ist neu?“-Gerüst, Auto-Update über `version.json`, Symbol (weißer Stern im Mittelkreis auf Rasengrün). Kein Querscrollen, keine Fehler. Online seit 16.11.2026, im Browser geprüft (Rundgang startet, Offline-Speicher mit allen 19 Dateien, keine Fehler). **Wartet auf iPhone-Test und Okay der Nutzerin.** Hinweis: Alle Apps auf bauer-reisen.github.io teilen sich Browser-Speicher und Offline-Speicher – darum Präfix halbzeit. / halbzeit-.
- [ ] 2 – Plätze (Worker `sportplatz` + D1, Liste, Suche, „Wo bin ich?“, „Platz fehlt – hier anlegen“)
- [ ] 3 – Bewerten
- [ ] 4 – Alltagstauglich (Warteschlange, Melden, Verwaltung mit `ADMIN_CODE`, Notbremse, Sicherung)
- [ ] 5 – Karte

## Als Nächstes
- Okay der Nutzerin zu Abschnitt 1 abwarten, dann Abschnitt 2 (Plätze).
