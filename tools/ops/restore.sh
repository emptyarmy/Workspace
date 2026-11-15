#!/bin/sh
# Wiederherstellung einer AI_TPI-Sicherung im Container-Betrieb (Phase 8e).
# Doku: Starlight „Betrieb → Backup und Wiederherstellung“.
#
#   tools/ops/restore.sh backups/ai-tpi-20261115-020000.dump
#
# ACHTUNG: Ersetzt die komplette Datenbank durch den Stand der Sicherung. Ablauf:
#   1. Sicherung prüfen   2. Anwendung anhalten   3. Datenbank neu anlegen und Sicherung einspielen
#   4. Anwendung starten (Migrationen bringen eine ältere Sicherung auf den Stand des Images)
#   5. auf den Healthcheck warten
# Ohne Rückfrage (z. B. für Wiederherstellungstests): RESTORE_CONFIRM=ja
set -eu
FILE=${1:?Aufruf: tools/ops/restore.sh <sicherung.dump>}
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.prod.yml}
ENV_FILE=${ENV_FILE:-.env.production}

compose() { docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

[ -s "$FILE" ] || { echo "FEHLER: $FILE fehlt oder ist leer." >&2; exit 1; }
TABLES=$(compose exec -T db pg_restore --list < "$FILE" | grep -c " TABLE DATA " || true)
[ "$TABLES" -gt 0 ] || { echo "FEHLER: $FILE ist keine gültige Sicherung." >&2; exit 1; }

if [ "${RESTORE_CONFIRM:-}" != "ja" ]; then
  echo "Die Datenbank wird durch $FILE ($TABLES Tabellen) ERSETZT. Alle Änderungen seit der Sicherung gehen verloren."
  printf 'Zum Fortfahren „WIEDERHERSTELLEN“ eingeben: '
  read -r ANSWER
  [ "$ANSWER" = "WIEDERHERSTELLEN" ] || { echo "Abgebrochen."; exit 1; }
fi

echo "1/4 Anwendung anhalten"
compose stop app
echo "2/4 Datenbank neu anlegen"
compose exec -T db sh -c 'dropdb -U "$POSTGRES_USER" --if-exists --force "$POSTGRES_DB" &&
  createdb -U "$POSTGRES_USER" -O "$POSTGRES_USER" "$POSTGRES_DB"'
echo "3/4 Sicherung einspielen"
compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --exit-on-error' < "$FILE"
echo "4/4 Anwendung starten"
compose start app

i=0
until compose exec -T app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; do
  i=$((i + 1))
  [ "$i" -le 60 ] || { echo "FEHLER: Anwendung nach 60 s nicht bereit – Protokoll: docker compose … logs app" >&2; exit 1; }
  sleep 1
done
echo "✓ Wiederhergestellt aus $FILE"
