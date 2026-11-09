# ADR-003: Backend, Datenhaltung und Betrieb

- **Status:** akzeptiert (09.11.2026)
- **Bezug:** F-09, N-05, N-06

## Entscheidung
- **Backend:** Node.js (LTS) + Fastify, TypeScript; **PostgreSQL** mit Drizzle ORM (ursprünglich Prisma – geändert durch ADR-007).
- **Betrieb Phase 1 – lokal:** Frontend und Backend laufen über `npm run dev` auf dem Entwicklerrechner. PostgreSQL und Mailpit kommen per `docker compose up -d db mailpit`.
- **Betrieb Phase 2 – CI/CD:** Eine Pipeline baut, testet (Lint, Typprüfung, Unit/API, Playwright auf allen Geräteprofilen) und stellt Container-Images bereit. Plattform und Zielumgebung: R-13.
- **Mail:** Standard ist der sendmail-Transport des Betriebssystems, im Admin-Bereich auf SMTP umstellbar.

## Konsequenzen
- Die Konfiguration erfolgt von Anfang an über Umgebungsvariablen (`.env.example`), damit der Wechsel zu CI/CD ohne Codeänderung gelingt.
- Datenbankmigrationen sind versioniert (Prisma Migrate) und laufen in der Pipeline automatisch.
- Ein Backup-Konzept wird spätestens für Phase 2 benötigt.
