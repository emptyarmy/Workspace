# Nichtfunktionale Anforderungen

| ID | Kategorie | Anforderung |
|---|---|---|
| NFA-01 | Responsive | Lauffähig und bedienbar ab 360 px Breite. Breakpoints: Mobil < 600 px, Tablet 600–1023 px, Laptop ≥ 1024 px. Hoch- und Querformat. |
| NFA-02 | Browser | Aktuelle Versionen von Chrome, Edge, Firefox, Safari (macOS/iOS), Samsung Internet (Android). |
| NFA-03 | Zielgeräte (Test) | Laptop (1366×768, 1920×1080), iPad, iPhone (aktuelles Modell), Samsung Galaxy S (aktuelles Modell) – über Playwright-Geräteprofile. |
| NFA-04 | Touch | Touch-Ziele ≥ 44×44 px; keine Hover-only-Funktionen. |
| NFA-05 | Performance | Erste Anzeige < 2 s lokal; Antwortwechsel < 100 ms; Bericht < 1 s bei ~210 KP. |
| NFA-06 | Netz | Nutzung im internen Netz; Internet nur für Cloud-KI-Anbieter nötig. |
| NFA-07 | Datenhaltung | Zentral auf dem Server (PostgreSQL); Backup täglich; Mehrbenutzerbetrieb mit Konflikterkennung. |
| NFA-08 | Datenschutz | Keine Übermittlung von Antworten/Kommentaren an KI-Dienste ohne explizite Bestätigung im Dialog; Namen von Autoren optional pseudonymisierbar. DSGVO-konform. |
| NFA-09 | Sicherheit | OWASP Top 10 berücksichtigt: Argon2id-Hashing, sichere Session-Cookies, CSRF-Schutz, Rate Limiting, Schutz vor Benutzer-Enumeration, XSS-Schutz, CSP; API-Schlüssel verschlüsselt und nur serverseitig; Rollenprüfung bei jedem API-Aufruf. |
| NFA-10 | Barrierefreiheit | WCAG 2.2 AA; Diagramme mit Tabellen-Alternative. |
| NFA-11 | Wartbarkeit | Inhalte (Katalog, Texte) getrennt vom Code; ESLint/Prettier; Modulstruktur. |
| NFA-12 | Testbarkeit | `data-testid` an allen interaktiven Elementen; Playwright Positiv- und Negativtests je Funktion; CI-fähig. |
| NFA-13 | Druck | Bericht druckbar auf A4 (Hoch-/Querformat) mit sauberem Seitenumbruch. |
| NFA-14 | Design | Modernes, ruhiges Erscheinungsbild; Hell-/Dunkelmodus ❓F-17; ggf. Corporate Design ❓F-17. |
| NFA-15 | Mehrbenutzer | Mindestens 50 gleichzeitige Nutzer ohne spürbare Verzögerung (❓N-17); Änderungen anderer innerhalb von 2 s sichtbar. |
| NFA-16 | Erweiterbarkeit Auth | Anmeldeverfahren über Provider-Schnittstelle austauschbar (SSO/OIDC). |
| NFA-17 | Betrieb | Bereitstellung per Docker Compose; Konfiguration über Umgebungsvariablen und Admin-Bereich. |
