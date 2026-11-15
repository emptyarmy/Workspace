# ADR-008: Produktionsbetrieb – ein Container, gebündelter Server

- **Status:** akzeptiert (15.11.2026, Phase 8c)
- **Bezug:** ADR-003 (Backend und Datenhaltung), Security-Review 8b (F-08, R-1, R-6), NFA Betrieb

## Kontext
Bis Phase 8b lief AI_TPI nur in der Entwicklung: Vite liefert die Oberfläche aus und leitet `/api` an den Server weiter, der Server läuft mit `tsx` direkt aus den TypeScript-Quellen. Für den Betrieb fehlten ein Produktions-Build, eine Content-Security-Policy für die Oberfläche und eine reproduzierbare Installation. Die Arbeitsbereichs-Pakete `@ai-tpi/shared` und `@ai-tpi/catalog` liegen nur als TypeScript vor.

## Entscheidung
1. **Ein Prozess liefert API und Oberfläche aus.** Ist `WEB_DIST_DIR` gesetzt, liefert der Fastify-Server die gebaute Vue-Oberfläche selbst aus (`apps/server/src/static.ts`): alle Dateien beim Start in den Speicher (kein Dateisystemzugriff je Anfrage, damit kein Pfad-Traversal), `/assets/*` ein Jahr cachebar, `index.html` `no-cache`, gzip, Single-Page-Fallback für Seitenpfade, 404 für fehlende Dateien und unbekannte API-Pfade. HTML bekommt eine eigene CSP ohne `unsafe-inline`/`unsafe-eval`; Bilder zusätzlich `https:` für Firmenlogos.
   *Verworfen:* ein zweiter Webserver (nginx) im Container oder ein eigener Container für die Oberfläche – mehr Teile, CORS bzw. zusätzliche Proxy-Regeln, ohne Nutzen bei der Größe der Anwendung. Ein Reverse Proxy für TLS bleibt ohnehin nötig.
2. **Server mit esbuild bündeln** (`apps/server/scripts/build.mjs` → `dist/server.mjs`, `dist/migrate.mjs`). Eigener Code und Arbeitsbereichs-Pakete werden eingebunden, npm-Abhängigkeiten bleiben extern (u. a. das native Modul von `@node-rs/argon2`).
   *Verworfen:* `tsx` als Laufzeitabhängigkeit (Compiler im Betrieb, langsamerer Start, größere Angriffsfläche); `tsc`-Ausgabe (die Pakete exportieren TS-Quellen, Importe ohne Dateiendung wären unter Node-ESM nicht auflösbar).
3. **Container-Image** (`Dockerfile`, mehrstufig) auf `node:22-bookworm-slim` (glibc, passende Prebuilds für argon2/rolldown), Laufzeit ohne devDependencies, Nutzer `node`, Migrationen beim Start (abschaltbar), Healthcheck auf `/api/health`. Betrieb mit `docker-compose.prod.yml` (App + PostgreSQL 16, Port nur an 127.0.0.1, `read_only`, `cap_drop: ALL`).
4. **Ersteinrichtung im Container über die Kommandozeile** (`ai-tpi-setup`): Das Skript ruft den Server im Container über 127.0.0.1 auf. Die Regel „nur über localhost“ (R-06) bleibt unverändert.
   *Verworfen:* private Netze als „lokal“ werten oder ein Einrichtungs-Token in der Oberfläche – öffnet die Einrichtung für das Netz bzw. braucht zusätzliche Oberfläche und Geheimnisverwaltung.

## Konsequenzen
- `npm run build` baut Oberfläche und Server; `npm run start` startet den Produktions-Server ohne tsx.
- Die E2E-Tests laufen zusätzlich gegen den Produktions-Build (`E2E_PROD=1`), damit CSP und Auslieferung mitgeprüft werden (TC-OPS-001/002). Der erste Lauf fand ein von der CSP blockiertes Firmenlogo (TC-ADM-006) – deshalb `img-src https:`.
- Neue Laufzeitabhängigkeiten müssen in `apps/server/package.json` stehen (sonst fehlen sie im Image).
- Mehrere Instanzen hinter einem Lastverteiler sind möglich, aber Rate-Limits und Live-Kanal gelten je Instanz (R-2); für Release 1 genügt eine Instanz.
