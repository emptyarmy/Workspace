#!/bin/sh
# Rauchtest für das Container-Image (Phase 8d; lokal und in der CI-Pipeline).
#
#   tools/docker/smoke-test.sh <image> <database-url>
#
# Startet das Image gehärtet (read-only, ohne Capabilities) im Host-Netz gegen eine leere PostgreSQL-Datenbank
# und prüft: Migrationen, Healthcheck, Auslieferung der Oberfläche mit CSP, Laufzeitnutzer ≠ root,
# Ersteinrichtung mit ai-tpi-setup, Anmeldung, geordnetes Herunterfahren (Exit-Code 0).
set -eu
IMAGE=${1:?Image fehlt}
DATABASE_URL=${2:?Datenbank-URL fehlt}
PORT=${SMOKE_PORT:-3399}
NAME=ai-tpi-smoke-$$
BASE=http://127.0.0.1:$PORT
fail() {
  echo "FEHLER: $*" >&2
  docker logs "$NAME" >&2 || true
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  exit 1
}

docker run -d --name "$NAME" --network host --read-only --tmpfs /tmp --cap-drop ALL \
  --security-opt no-new-privileges:true \
  -e DATABASE_URL="$DATABASE_URL" -e SERVER_PORT="$PORT" -e PUBLIC_BASE_URL=https://tpi.example.com \
  -e SECRET_ENCRYPTION_KEY=smoke-test-0123456789abcdef0123456789abcdef -e SMTP_HOST=127.0.0.1 \
  -e COOKIE_SECURE=false "$IMAGE" >/dev/null

i=0
until curl -fs "$BASE/api/health" >/dev/null 2>&1; do
  i=$((i + 1))
  [ "$i" -le 60 ] || fail "Server nach 60 s nicht erreichbar"
  sleep 1
done
docker logs "$NAME" 2>&1 | grep -q "Migration und Stammdaten: OK" || fail "Migrationen nicht gelaufen"
echo "✓ Migrationen und Healthcheck"

[ "$(docker exec "$NAME" node -e 'console.log(process.getuid())')" != "0" ] || fail "läuft als root"
echo "✓ Laufzeitnutzer ist nicht root"

HEADERS=$(curl -fsI "$BASE/start")
echo "$HEADERS" | grep -qi "^content-type: text/html" || fail "Oberfläche nicht ausgeliefert"
echo "$HEADERS" | grep -qi "^content-security-policy: default-src 'self'; script-src 'self'" || fail "CSP fehlt"
curl -fs "$BASE/start" | grep -q '<div id="app"></div>' || fail "index.html fehlt"
echo "✓ Weboberfläche mit Content-Security-Policy"

docker exec -e SETUP_COMPANY_NAME="Heise Medien" -e SETUP_COMPANY_SLUG=heise -e SETUP_INDUSTRY_CODE=PUB \
  -e SETUP_ADMIN_NAME="Anna Admin" -e SETUP_ADMIN_EMAIL=anna@heise.de \
  -e SETUP_ADMIN_PASSWORD='Weißer-Leuchtturm-42!' "$NAME" ai-tpi-setup | grep -q "Eingerichtet" ||
  fail "Ersteinrichtung fehlgeschlagen"
STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/login" \
  -H 'content-type: application/json' -H 'x-requested-with: ai-tpi' \
  -d '{"email":"anna@heise.de","password":"Weißer-Leuchtturm-42!","slug":"heise"}')
[ "$STATUS" = "200" ] || fail "Anmeldung: HTTP $STATUS"
echo "✓ Ersteinrichtung mit ai-tpi-setup und Anmeldung"

docker stop -t 10 "$NAME" >/dev/null
[ "$(docker inspect -f '{{.State.ExitCode}}' "$NAME")" = "0" ] || fail "kein geordnetes Herunterfahren"
docker rm "$NAME" >/dev/null
echo "✓ Geordnetes Herunterfahren"
echo "Rauchtest bestanden: $IMAGE"
