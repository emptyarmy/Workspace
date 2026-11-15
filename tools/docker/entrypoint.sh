#!/bin/sh
# Startskript des AI_TPI-Containers: erst Migrationen (abschaltbar mit RUN_MIGRATIONS=false), dann der Server.
# exec → der Server ist PID 1 und erhält SIGTERM von „docker stop“ direkt (geordnetes Herunterfahren).
set -e
cd /app/apps/server
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "AI_TPI: Datenbank-Migrationen …"
  node --enable-source-maps dist/migrate.mjs
fi
exec node --enable-source-maps dist/server.mjs
