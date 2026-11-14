# Roadmap und Meilensteine (Version 3)

Version 2: Server, Anmeldung, Admin-Bereich, Mehrbenutzerbetrieb (+3–4 Wochen). Version 3: Vue + TypeScript, Mandanten mit Benchmark, Zusammenführung der Abteilungsantworten, Änderungshistorie, Ersteinrichtung/Einladung (+ca. 2–3 Wochen).

```mermaid
gantt
  dateFormat  YYYY-MM-DD
  title AI_TPI – Planungsvorschlag (Start nach Klärung der 🔴-Fragen)
  section Klärung & Katalog
  Analyse & Plan                     :done, p0, 2026-11-08, 2d
  Offene Fragen Runde 3 (R-xx)       :p1, after p0, 4d
  Katalog TPI NEXT bereinigen DE/EN  :p2, after p1, 6d
  Agile Ergänzung zuordnen           :p2a, after p1, 5d
  KI-Kernbereiche finalisieren       :p2b, after p1, 4d
  section Fundament
  Monorepo, Docker, DB, CI, Playwright :p3, after p1, 4d
  Auth: Ersteinrichtung, Einladung, Einmal-Link, Passwortregeln :p4, after p3, 7d
  Admin: Benutzer (inkl. Lösch-Dialog), Firmen/Logo/Branche, Abteilungen, Mail :p5, after p4, 6d
  section Erfassung
  Assessment, Mitglieder, Zuweisung  :p6, after p5, 4d
  Fragebogen responsive              :p7, after p6, 6d
  Kommentare, Quellen                :p8, after p7, 3d
  Mehrbenutzer: Live-Updates, Konflikte :p9, after p8, 4d
  Zusammenführung + Änderungshistorie :p9b, after p9, 5d
  section Auswertung
  Scoring Engine                     :p10, after p3, 3d
  Bericht & Diagramme, PDF           :p11, after p9b, 6d
  Benchmark (Snapshot, Aggregation, Anonymität) :p11b, after p11, 4d
  section Empfehlungen
  Regel-Engine                       :p12, after p10, 3d
  KI-Adapter + Admin-KI-Konfiguration :p13, after p11b, 5d
  CI/CD-Pipeline (Phase 2 Betrieb)   :p13b, after p13, 3d
  section Abschluss
  Test-Härtung, Security-Review, A11y :p14, after p13, 5d
  Abnahme                            :p15, after p14, 2d
```

## Meilensteine

| MS | Inhalt | Abnahmekriterium |
|---|---|---|
| MS-0 | Plan & Struktur | ☑ erledigt |
| MS-1 | Anforderungen geklärt | ☑ alle 🔴-Fragen beantwortet (09.11.2026) |
| MS-2 | Fragenkatalog v1.0 (◐ Entwurf am 09.11.2026 erstellt, Freigabe ausstehend) | 19 KB, TPI NEXT + Agile + KI, DE/EN, Schema-validiert, fachlich freigegeben |
| MS-3 | Fundament (☑ 09.11.2026) | `docker compose up` startet App + DB + Mailpit; Login-Seite mit Logo; erster Playwright-Test grün auf allen Profilen |
| MS-4 | Anmeldung & Admin (☑ 09.11.2026) | Testfälle SET, USR, AUTH, RST, PWD, ADM (ohne KI) grün |
| MS-5 | Erfassung & Zusammenführung (☑ 13.11.2026) | Testfälle ASM, ANS, COM, SRC, I18N, MU, CONS, HIST, TEN grün |
| MS-6 | Bericht & Benchmark (☑ 14.11.2026) | Testfälle REP, IO, BM grün |
| MS-7 | Empfehlungen (☑ 14.11.2026, Testfälle im Container auf Chrome und Samsung grün) | Testfälle REC, ADM-KI grün |
| MS-8 | Release 1.0 | alle Tests grün (lokal **und** in der CI/CD-Pipeline), Security-Review ohne kritische Befunde, A11y ok, Abnahme |

## Release-Schnitt

| Release | Umfang |
|---|---|
| **1.0** | Ersteinrichtung, Einladung, Login, Einmal-Link, Passwortregeln + Stärke; Rollen Admin/Assessor/Befragter/Leser; Admin (Benutzer inkl. Lösch-Dialog, Firmen mit Logo + Branche, Abteilungen, KI, Mail, Historie); Mandanten; Abteilungserfassung DE/EN + Zusammenführung; Kommentare; Bericht mit Benchmark; Regel- + KI-Empfehlungen; PDF/JSON; CI/CD-Pipeline |
| **1.1** | Vorjahresvergleich, Excel-Export, E-Mail-Benachrichtigungen, Katalogpflege im Admin |
| **2.0** | SSO (OIDC), Firmen-Admins, Export Maßnahmen nach Jira/aqua |
