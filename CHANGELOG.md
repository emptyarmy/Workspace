# Änderungsprotokoll

Alle nennenswerten Änderungen an AI_TPI. Versionen sind Git-Tags (`vX.Y.Z`). Bei jeder Version steht, ob sie die Datenbank ändert – das entscheidet über den Weg beim Rollback (Starlight „Betrieb → Update und Rollback“).

## 1.0.0 – zur Abnahme (Stand 16.11.2026)

Erste vollständige Version. Datenbank: Erstinstallation (Migrationen 0000 … 0005).

### Funktionen

- Ersteinrichtung (erster Admin, erste Firma), Einladung per E-Mail, Einmal-Link, Passwortregeln mit Stärkeanzeige, Kontosperre
- Rollen Admin, Assessor, Befragter, Leser; Mandantentrennung je Firma
- Admin-Bereich: Benutzer, Abteilungen, Firma mit Logo und Branche, Branchenliste, E-Mail, KI-Module, Audit-Log; Admins für andere Firmen
- Fragenkatalog v1.0: 19 Kernbereiche, 223 Kontrollpunkte (TPI NEXT, agile Ergänzungen, KI), Deutsch und Englisch, mit Sichten und Abhängigkeiten
- Assessments: Team und Zuweisung je Abteilung, Fragebogen mit Kommentaren und Quellen, Zwischenstand jederzeit gespeichert, Abgabe je Abteilung erst mit vollständigen Angaben, Live-Aktualisierung und Anwesenheit, Zusammenführung, Änderungshistorie, Duplizieren, JSON-Export und -Import
- Bericht mit Reifegraden und Diagrammen, Druck auf A4; anonymer Branchen-Benchmark (ab 5 Firmen, Opt-out)
- Handlungsempfehlungen: Regel-Engine, optional KI (Anthropic, Azure OpenAI, Ollama, OpenAI-kompatibel) mit Einwilligung und Rückfall auf Regeln; Maßnahmenplan, CSV-Export

### Nach der Erprobung ergänzt

- Test-Mail: Grund des Fehlschlags in der Meldung (nicht erreichbar, Zeitüberschreitung, Anmeldung abgelehnt, TLS, Nachricht abgelehnt)
- Fragebogen: Abgabe erst mit vollständigen Angaben, Zwischenstand sichtbar, „Später fortsetzen“
- Bericht: kein seitliches Scrollen auf schmalen Bildschirmen mit breiter Schrift

### Betrieb und Sicherheit

- Produktions-Build: ein Container liefert API und Weboberfläche aus (Content-Security-Policy, kein tsx zur Laufzeit), `docker-compose.prod.yml`, Ersteinrichtung mit `ai-tpi-setup` (ADR-008)
- Sicherung, Wiederherstellung und Selbsttest: `tools/ops/backup.sh`, `restore.sh`, `selftest.sh`
- Security-Review nach OWASP Top 10: Rate-Limits, Sicherheits-Header, SSRF-Sperre, Protokoll mit Schwärzung; `npm audit` ohne Befund
- CI-Pipeline (GitHub Actions): Prüfungen, Unit/DB, E2E gegen den Produktions-Build je Browser-Engine, Container mit Rauchtest und Selbsttest

### Tests und Dokumentation

- Durchgängiges Szenario „Humani“ von der leeren Datenbank bis zum Bericht, mit echtem Mailversand an Mailpit (`npm run test:szenario`)
- 266 Testfälle automatisiert (Playwright auf 7 Geräteprofilen, Vitest), Positiv- und Negativtests
- Dokumentation (Astro/Starlight): Handbuch mit „Erste Schritte nach Rolle“, Betrieb, Entwicklung, Referenz, Projektdokumentation; Abnahme-Checkliste

### Bekannte Grenzen

Siehe `docs/05_test/04_abnahme-checkliste.md`, Abschnitt „Bekannte Grenzen von Release 1.0“.
