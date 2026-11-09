# ADR-006: Mandantenfähigkeit und Benchmark

- **Status:** akzeptiert (09.11.2026); Details offen (R-03 bis R-05, S-05 bis S-09)
- **Bezug:** N-11

## Kontext
Mehrere Firmen nutzen die Anwendung mit ihrem eigenen Logo. Der Bericht soll jede Firma mit ihrer Branche und mit allen bewerteten Firmen vergleichen.

## Entscheidung
- **Eine Installation, mehrere Firmen (Mandanten)** mit `companyId` in allen fachlichen Tabellen, serverseitiger Prüfung bei jedem Zugriff und PostgreSQL Row Level Security als zweiter Schutzschicht.
- Je Firma: Name, Kürzel, Logo und **Branche** aus einer pflegbaren Branchenliste mit 25 Einträgen, angelehnt an WZ 2008 / NACE.
- **Firmen-Administration (R-02):** Jeder Admin verwaltet nur seine Firma. Nutzer-E-Mails müssen zu den Domains der Firma gehören. Admins können **neue Firmen** samt Admin sowie **weitere Admins für bestehende Firmen** anlegen (S-01) und behalten Zugriff auf diese Admin-Konten (nur Rolle/Aktiv-Status), nicht auf Fachdaten.
- **Externe Berater** erhalten Firmenadressen mit Präfix `ext.` und werden gekennzeichnet (S-03).
- **KI-Module und Mailserver je Firma** (S-04).
- **Login je Firma (R-01):** `/login/<firmenkürzel>`.
- **Benchmark** auf Basis eines Snapshots, der bei der Freigabe eines Assessments erzeugt wird. Angezeigt werden nur aggregierte Werte (Median, Quartile), und erst ab einer Mindestanzahl von Firmen.

## Konsequenzen
- Mandantentrennung erhält eigene Negativtests (Zugriff auf fremde IDs).
- Eine Domain-Prüfung bei jeder Nutzeranlage und E-Mail-Änderung; Freemail-Sperrliste.
- Schutz des letzten Admins gilt je Firma.
