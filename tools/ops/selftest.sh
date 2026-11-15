#!/bin/sh
# Selbsttest der Betriebsskripte (Phase 8e; lokal und in der CI-Pipeline).
#
#   tools/ops/selftest.sh [image]          # Standard: ai-tpi:latest (vorher: docker build -t ai-tpi .)
#
# Startet AI_TPI mit docker-compose.prod.yml als eigenes Compose-Projekt „ai-tpi-selftest“ (eigene Datenbank,
# Port 3398 – ein laufendes Produktivsystem bleibt unberührt) und prüft den ganzen Betriebsablauf:
#   Start mit Healthcheck → Ersteinrichtung (ai-tpi-setup) → Sicherung (backup.sh) → Rotation →
#   Veränderung der Daten → Wiederherstellung (restore.sh) → Anmeldung mit den gesicherten Daten.
# Räumt am Ende alles wieder weg (Container, Volume, temporäre Dateien).
set -eu
cd "$(dirname "$0")/../.."
IMAGE=${1:-ai-tpi:latest}
WORK=$(mktemp -d)
export COMPOSE_PROJECT_NAME=ai-tpi-selftest
export COMPOSE_FILE=docker-compose.prod.yml
export ENV_FILE="$WORK/env"
export BACKUP_DIR="$WORK/backups"
PORT=${SELFTEST_PORT:-3398}
BASE=http://127.0.0.1:$PORT
PASSWORD='Weißer-Leuchtturm-42!'

compose() { docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }
cleanup() {
  compose down -v >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
fail() {
  echo "FEHLER: $*" >&2
  compose logs --tail 40 app >&2 || true
  cleanup
  exit 1
}
trap 'cleanup' INT TERM
login() {
  curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/login" \
    -H 'content-type: application/json' -H 'x-requested-with: ai-tpi' \
    -d "{\"email\":\"anna@heise.de\",\"password\":\"$PASSWORD\",\"slug\":\"heise\"}"
}
sql() { compose exec -T db sh -c "psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -Atc \"$1\""; }

# Konfiguration aus der Vorlage – so wird auch .env.production.example mitgeprüft
sed -e 's/^POSTGRES_PASSWORD=$/POSTGRES_PASSWORD=selftest0123456789abcdef/' \
  -e 's/^SECRET_ENCRYPTION_KEY=$/SECRET_ENCRYPTION_KEY=selftest-0123456789abcdef0123456789abcdef/' \
  -e "s/^APP_PORT=.*/APP_PORT=$PORT/" -e "s|^APP_IMAGE=.*|APP_IMAGE=$IMAGE|" \
  -e 's/^COOKIE_SECURE=.*/COOKIE_SECURE=false/' .env.production.example >"$ENV_FILE"

echo "1/6 Start (docker compose up, wartet auf den Healthcheck)"
compose up -d --no-build --wait >/dev/null 2>&1 || fail "Start fehlgeschlagen"
curl -fs "$BASE/api/health" | grep -q '"status":"ok"' || fail "/api/health meldet nicht ok"

echo "2/6 Ersteinrichtung"
compose exec -T -e SETUP_COMPANY_NAME="Heise Medien" -e SETUP_COMPANY_SLUG=heise \
  -e SETUP_INDUSTRY_CODE=PUB -e SETUP_ADMIN_NAME="Anna Admin" -e SETUP_ADMIN_EMAIL=anna@heise.de \
  -e SETUP_ADMIN_PASSWORD="$PASSWORD" app ai-tpi-setup | grep -q "Eingerichtet" ||
  fail "ai-tpi-setup fehlgeschlagen"
[ "$(login)" = "200" ] || fail "Anmeldung nach der Ersteinrichtung"

echo "3/6 Sicherung"
tools/ops/backup.sh >/dev/null || fail "backup.sh"
FIRST=$(ls -1 "$BACKUP_DIR"/ai-tpi-*.dump)
[ -s "$FIRST" ] || fail "Sicherung fehlt"

echo "4/6 Rotation (KEEP=1)"
sleep 1
KEEP=1 tools/ops/backup.sh >/dev/null || fail "backup.sh (zweiter Lauf)"
[ "$(ls -1 "$BACKUP_DIR"/ai-tpi-*.dump | wc -l)" -eq 1 ] || fail "Rotation hat nicht aufgeräumt"
[ ! -e "$FIRST" ] || fail "Rotation hat die falsche Sicherung behalten"
DUMP=$(ls -1 "$BACKUP_DIR"/ai-tpi-*.dump)

echo "5/6 Daten nach der Sicherung verändern, ungültige Sicherung abweisen"
sql "create table restore_marker (x int)" >/dev/null || fail "Marker anlegen"
echo "kaputt" >"$WORK/kaputt.dump"
if RESTORE_CONFIRM=ja tools/ops/restore.sh "$WORK/kaputt.dump" >/dev/null 2>&1; then
  fail "restore.sh hat eine ungültige Sicherung angenommen"
fi
[ "$(sql "select count(*) from pg_tables where tablename = 'restore_marker'")" = "1" ] ||
  fail "ungültige Sicherung hat die Datenbank verändert"

echo "6/6 Wiederherstellung"
RESTORE_CONFIRM=ja tools/ops/restore.sh "$DUMP" >/dev/null || fail "restore.sh"
[ "$(sql "select count(*) from pg_tables where tablename = 'restore_marker'")" = "0" ] ||
  fail "Datenbank wurde nicht durch die Sicherung ersetzt"
[ "$(login)" = "200" ] || fail "Anmeldung nach der Wiederherstellung"

cleanup
echo "Selbsttest bestanden: Start, Ersteinrichtung, Sicherung, Rotation, Wiederherstellung ($IMAGE)"
