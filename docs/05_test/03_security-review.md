# Security-Review (Phase 8b)

| | |
|---|---|
| Stand | 15.11.2026, Release-Kandidat 1.0 |
| Umfang | Server (`apps/server`), Weboberfläche (`apps/web`), Abhängigkeiten, Konfiguration, Mandantentrennung |
| Grundlage | OWASP Top 10 (2021), Anforderungen NFA/S-Punkte, Architektur `04_architektur/06_authentifizierung-und-sicherheit.md` |
| Methode | Code-Review aller Endpunkte, `npm audit`, automatisierte Negativtests (Rechte, Mandanten, CSRF, Header, Rate-Limits, SSRF) |
| Ergebnis | **Keine kritischen oder hohen Befunde offen.** 9 Befunde behoben (siehe Abschnitt 2), Restrisiken für den Betrieb in Abschnitt 3 |

## 1. Prüfung nach OWASP Top 10 (2021)

| Risiko | Maßnahmen in AI_TPI | Nachweis (Tests) | Bewertung |
|---|---|---|---|
| **A01 Broken Access Control** | Jede Abfrage ist an die Firma gebunden (`companyId`); fremde IDs liefern **404** statt 403, damit keine Existenz verraten wird. Rechte je Assessment zentral in `loadAccess` (Mitglied, Rolle, Abteilung); Admins nur lesend auf Ergebnisse (S-11); Ersteinrichtung nur direkt über localhost | `rechte-und-mandanten.spec.ts` (alle Lese- und Schreib-Endpunkte eines fremden Assessments, Admin-Endpunkte einer fremden Firma), TC-TEN-001…029, TC-ADM-029/036/037, TC-USR-014/018/019, `security.test.ts` (Setup hinter Proxy) | erfüllt (Befund F-04 behoben) |
| **A02 Cryptographic Failures** | Passwörter mit Argon2id (19 MiB, t = 2, OWASP-Mindestwerte); Sitzungs- und Einmal-Token mit 256 Bit Zufall, in der DB nur als SHA-256-Hash; SMTP-Passwörter und KI-Schlüssel AES-256-GCM-verschlüsselt (`SECRET_ENCRYPTION_KEY`, in production Pflicht), nie im Klartext ausgeliefert; Cookie `HttpOnly`, `SameSite=Lax`, in production `Secure`; HSTS bei HTTPS | `auth-admin.integration.test.ts`, `admin-4b.integration.test.ts` (Schlüssel maskiert), `security.test.ts` (Secure/HSTS) | erfüllt (Befund F-05 behoben) |
| **A03 Injection** | Datenbank nur über Drizzle mit Parametern (auch alle `sql`-Fragmente); Eingaben mit zod geprüft (Längen, Formate, `strict`); Vue escaped alle Ausgaben, kein `v-html`; CSV-Exporte entschärfen Formeln (`=`, `+`, `-`, `@`) | TC-REC-014, TC-HIST-003, Audit-CSV-Test, Feldvalidierungstests | erfüllt |
| **A04 Insecure Design** | Mandantentrennung und Rollen als Architekturentscheidung (ADR-005/006); KI-Datenschutz mit Vorschau und ausdrücklicher Zustimmung, ohne Zustimmung kein Netzwerkaufruf; Benchmark nur aggregiert ab 5 Firmen; Optimistic Locking gegen verlorene Änderungen | TC-REC-007, TC-BM-001…006, TC-MU-002 | erfüllt |
| **A05 Security Misconfiguration** | Sicherheits-Header für alle Antworten (CSP `default-src 'none'` für die API, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, COOP/CORP, `Permissions-Policy`); Testendpunkte nur mit `NODE_ENV=test` **und** `TEST_ENDPOINTS=true`; keine Stacktraces an Clients; production verlangt den Verschlüsselungsschlüssel | `security.test.ts`, `sicherheit.spec.ts` | erfüllt (Befunde F-03, F-08 behoben) |
| **A06 Vulnerable and Outdated Components** | `npm audit`: **0 Schwachstellen**. Fehlerhafte Einordnung zweier Entwicklungswerkzeuge als Laufzeit-Abhängigkeit korrigiert; transitive Schwachstellen über `overrides` behoben | `npm audit` in der CI (8d) | erfüllt (Befunde F-01, F-02 behoben) |
| **A07 Identification and Authentication Failures** | Passwortregeln + Stärke ≥ „mittel“ (zxcvbn, Bezug zu Name/E-Mail verboten); Kontosperre nach 5 Fehlversuchen (15 min); **Rate-Limit je Client-Adresse** für Anmeldung, „Passwort vergessen“, Passwort setzen und Ersteinrichtung; höchstens 3 Reset-Mails je Adresse in 15 min; identische Antworten und Antwortzeiten für bekannte/unbekannte Adressen; Sitzung 1 h Leerlauf / 12 h absolut; Einmal-Links 30 min, einmal verwendbar | TC-AUTH-*, TC-PWD-*, TC-RST-*, `security.test.ts` | erfüllt (Befunde F-06, F-07 behoben) |
| **A08 Software and Data Integrity Failures** | `package-lock.json` mit Integritätsprüfsummen, `npm ci` in der CI; Änderungshistorie per DB-Trigger unveränderbar (append-only); JSON-Import mit Schema- und Versionsprüfung | TC-HIST-004, TC-IO-002…005 | erfüllt |
| **A09 Security Logging and Monitoring Failures** | Audit-Log für sicherheitsrelevante Ereignisse (Anmeldung, Sperre, Passwort, Admin-Aktionen auch firmenübergreifend, jeder KI-Aufruf); **JSON-Protokoll auf stdout auch in production**, Cookies und Schlüssel werden geschwärzt | TC-ADM-014/047, TC-REC-006 | erfüllt (Befund F-03 behoben) |
| **A10 Server-Side Request Forgery** | Ausgehende Aufrufe nur zu KI-Diensten, deren Adresse ein Admin der Firma hinterlegt; Weiterleitungen werden nicht verfolgt; **link-lokale Adressen und Cloud-Metadaten-Dienste gesperrt** (169.254.0.0/16, fe80::/10, fd00:ec2::254, 0.0.0.0/8), auch nach DNS-Auflösung. Lokale Modelle (localhost, internes Netz) bleiben bewusst erlaubt (ADR-004) | `security.test.ts` | erfüllt mit Restrisiko R-3 (Befund F-09 behoben) |

**CSRF:** Jede schreibende Anfrage braucht den Header `X-Requested-With: ai-tpi`, den Browser nur bei Anfragen derselben Herkunft setzen; zusammen mit `SameSite=Lax` (TC: `sicherheit.spec.ts`, alle API-Tests).

**XSS:** Keine HTML-Ausgabe aus Benutzerdaten; die CSP für die ausgelieferte Weboberfläche folgt mit dem Produktions-Build (8c).

## 2. Befunde und Behebung

| Nr. | Befund | Schwere | Behebung | Status |
|---|---|---|---|---|
| F-01 | `npm audit`: 11 mittlere Schwachstellen in Entwicklungswerkzeugen (`esbuild` über `drizzle-kit`, `minimatch` über `typescript-eslint`). `npm audit fix --force` hätte `drizzle-kit` auf eine veraltete Version zurückgestuft | mittel | `overrides` in `package.json` (`esbuild` ^0.25, `minimatch` ^11.0.8); `drizzle-kit` und ESLint geprüft | behoben |
| F-02 | `drizzle-kit` (Wurzel) und `typescript-eslint` (Server) standen unter `dependencies` und wären in den Produktions-Container gelangt | niedrig | nach `devDependencies` verschoben bzw. entfernt | behoben |
| F-03 | In production war das Server-Protokoll komplett abgeschaltet – Angriffe und Fehler wären unsichtbar geblieben | mittel | JSON-Protokoll (Stufe `LOG_LEVEL`, Standard `info`), Cookies/Autorisierung/API-Schlüssel geschwärzt | behoben |
| F-04 | Ersteinrichtung: Läuft ein Reverse Proxy auf demselben Rechner, kämen Anfragen von außen „von localhost“ und könnten – solange noch kein Nutzer existiert – die Einrichtung übernehmen | hoch | Anfragen mit Weiterleitungs-Headern (`X-Forwarded-For`, `Forwarded`, `X-Real-IP`, `X-Forwarded-Host/-Proto`) gelten nicht als lokal; geprüft wird weiter die Socket-Adresse, auch mit `TRUST_PROXY` | behoben |
| F-05 | `COOKIE_SECURE` war standardmäßig aus, auch in production | mittel | in production standardmäßig an (bewusst abschaltbar für ein Intranet ohne HTTPS); HSTS, wenn aktiv | behoben |
| F-06 | Kein Rate-Limit je Client-Adresse – die Kontosperre schützt ein Konto, aber nicht vor dem Durchprobieren vieler Konten (Credential Stuffing) und vor Mail-Flut über „Passwort vergessen“ | mittel | 30 Anfragen/min je Adresse für Anmeldung, „Passwort vergessen“, Passwort setzen, Ersteinrichtung (`AUTH_RATE_LIMIT_PER_MIN`); max. 3 Reset-Mails je Adresse und 15 min (`RESET_MAILS_PER_15_MIN`); Oberfläche zeigt „Zu viele Anfragen …“ | behoben |
| F-07 | „Passwort vergessen“: Für bekannte Adressen wartete der Server auf den Mailversand – an der Antwortzeit ließ sich erkennen, ob ein Konto existiert | mittel | Versand im Hintergrund; Antwort und Antwortzeit gleich | behoben |
| F-08 | Keine Content-Security-Policy, kein HSTS, keine COOP/CORP/Permissions-Policy | niedrig | Header ergänzt (API: alles verboten). Weboberfläche (8c): `default-src 'self'`, Skripte und Stile nur vom eigenen Ursprung, kein `unsafe-inline`/`unsafe-eval`, Bilder zusätzlich `https:` (Firmenlogos), `frame-ancestors 'none'`; geprüft mit TC-OPS-001/002 und dem vollständigen E2E-Lauf gegen den Produktions-Build | behoben |
| F-09 | KI-Module: Ein Admin kann eine beliebige Basis-URL hinterlegen; der Server ruft sie auf (Verbindungstest, Empfehlungen). Ziel Cloud-Metadaten-Dienst → Abgriff von Cloud-Zugangsdaten möglich | mittel | Link-lokale/Metadaten-Adressen gesperrt (vor und nach DNS-Auflösung), Meldung „Diese Adresse ist gesperrt“ | behoben, Restrisiko R-3 |
| F-10 | Container (8c): Die Ersteinrichtung ist nur über localhost erlaubt; im Container kommen Anfragen vom Host über das Docker-Netz. Eine Lockerung (z. B. „privates Netz gilt als lokal“) hätte die Einrichtung für alle Rechner im Netz geöffnet | mittel | keine Lockerung: Ersteinrichtung im Container über den Befehl `ai-tpi-setup` (spricht den Server über 127.0.0.1 an; setzt Zugriff auf den Host voraus) | behoben |
| F-11 | Container (8c): Laufzeit ohne Härtung hätte als root mit beschreibbarem Code und allen Capabilities laufen können | niedrig | Nutzer `node`, Code gehört root, `read_only`, `cap_drop: ALL`, `no-new-privileges`, Port nur an 127.0.0.1, keine devDependencies und kein tsx im Image, `.dockerignore` schließt `.env` und Originaldokumente aus | behoben |
| H-1 | Feld `mustChangePassword`: Seit R-07 setzt jeder sein Passwort selbst über den Einmal-Link; das Feld wird nirgends mehr auf „wahr“ gesetzt | Hinweis | bleibt als reserviertes Feld bestehen (keine Migration nötig); TC-RST-006 entsprechend neu gefasst | dokumentiert |

## 3. Restrisiken und Auflagen für den Betrieb

| Nr. | Restrisiko | Auflage / Empfehlung |
|---|---|---|
| R-1 | Ohne HTTPS gehen Passwörter und Sitzungs-Cookies unverschlüsselt über das Netz | Betrieb nur hinter einem Reverse Proxy mit TLS; `COOKIE_SECURE` nicht abschalten (siehe Betriebsdokumentation) |
| R-2 | Rate-Limits liegen im Speicher eines Serverprozesses. Hinter einem Proxy ohne `TRUST_PROXY=true` teilen sich alle Nutzer ein Kontingent; bei mehreren Instanzen gilt das Limit je Instanz | Hinter einem Proxy `TRUST_PROXY=true` setzen (der Proxy muss `X-Forwarded-For` selbst setzen bzw. überschreiben); für Lastverteilung zusätzlich Limits im Proxy |
| R-3 | SSRF: Interne Adressen (localhost, private Netze) bleiben für lokale KI-Modelle erlaubt; ein Firmen-Admin kann so interne HTTP-Dienste ansprechen (nur Status/Zeit sichtbar, kein Antwortinhalt außer bei KI-Format). DNS-Rebinding zwischen Prüfung und Aufruf ist nicht ausgeschlossen | Server in einem Netzsegment ohne Zugriff auf sensible interne Dienste betreiben; ausgehenden Verkehr per Firewall auf die genutzten KI-Dienste beschränken |
| R-4 | Kontosperre nach 5 Fehlversuchen kann gezielt ausgelöst werden (Aussperren eines bekannten Kontos für 15 min) | akzeptiert (übliche Abwägung); Rate-Limit je Adresse begrenzt das Ausmaß |
| R-5 | Kein Schlüsselwechsel für `SECRET_ENCRYPTION_KEY` vorgesehen; Verlust des Schlüssels macht gespeicherte SMTP-Passwörter und KI-Schlüssel unlesbar | Schlüssel sicher und getrennt von den Backups aufbewahren; bei Verdacht Schlüssel tauschen und Geheimnisse im Admin-Bereich neu eingeben (Release 2: Werkzeug zur Umschlüsselung) |
| R-6 | Ersteinrichtung bleibt aktivierbar, bis der erste Nutzer existiert | nach der Einrichtung `SETUP_ENABLED=false` setzen |
| R-7 | Abhängigkeiten altern | `npm audit` in jeder CI-Ausführung (8d); Updates mindestens monatlich |

## 4. Barrierefreiheit (A11y)

Automatisierte Prüfung mit axe-core (WCAG 2.1 A/AA) für alle Seiten und Dialoge in `barrierefreiheit.spec.ts` (Desktop und iPhone): Anmeldung, Passwort, Ersteinrichtung, 404, Start, alle Admin-Reiter, Bestätigungsdialog, Assessments, Fragebogen mit Kommentaren, Zusammenführung, Bericht, Benchmark, Empfehlungen mit Datenschutz-Dialog – **ohne Befund**. Tastaturbedienung (TC-ANS-010, Reiter, Dialoge mit Fokus auf „Abbrechen“), Touch-Ziele ≥ 44 px (TC-RWD-002) und 320 px Breite (TC-RWD-004) sind getestet.

Automatisierte Prüfungen finden erfahrungsgemäß nur einen Teil der Probleme. Für die Abnahme wird eine kurze manuelle Prüfung mit Screenreader (VoiceOver bzw. NVDA) für Anmeldung, Fragebogen und Bericht empfohlen.
