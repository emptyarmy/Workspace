#!/bin/sh
# Datensicherung der AI_TPI-Datenbank im Container-Betrieb (Phase 8e).
# Doku: Starlight „Betrieb → Backup und Wiederherstellung“.
#
#   tools/ops/backup.sh                 # Sicherung nach ./backups, die neuesten 14 bleiben
#   BACKUP_DIR=/srv/backup/ai-tpi KEEP=30 tools/ops/backup.sh
#
# Erzeugt eine Sicherung im PostgreSQL-Custom-Format (pg_dump -Fc, komprimiert) und prüft sie mit
# pg_restore --list. Läuft im Projektordner; Compose-Datei und .env-Datei lassen sich überschreiben.
# Nicht in der Sicherung: SECRET_ENCRYPTION_KEY (steht in .env.production) – getrennt aufbewahren!
set -eu
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.prod.yml}
ENV_FILE=${ENV_FILE:-.env.production}
BACKUP_DIR=${BACKUP_DIR:-./backups}
KEEP=${KEEP:-14}

compose() { docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

umask 077
mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d-%H%M%S)
FILE="$BACKUP_DIR/ai-tpi-$STAMP.dump"
TMP="$FILE.part"

echo "AI_TPI: Sicherung → $FILE"
compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$TMP"
[ -s "$TMP" ] || { rm -f "$TMP"; echo "FEHLER: Sicherung ist leer." >&2; exit 1; }
TABLES=$(compose exec -T db pg_restore --list < "$TMP" | grep -c " TABLE DATA " || true)
[ "$TABLES" -gt 0 ] || { rm -f "$TMP"; echo "FEHLER: Sicherung enthält keine Tabellen." >&2; exit 1; }
mv "$TMP" "$FILE"
echo "✓ $(du -h "$FILE" | cut -f1) – $TABLES Tabellen"

# Rotation: nur die neuesten $KEEP Sicherungen behalten
COUNT=0
for f in $(ls -1t "$BACKUP_DIR"/ai-tpi-*.dump 2>/dev/null); do
  COUNT=$((COUNT + 1))
  if [ "$COUNT" -gt "$KEEP" ]; then
    rm -f "$f"
    echo "  alte Sicherung entfernt: $(basename "$f")"
  fi
done
