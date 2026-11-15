#!/bin/sh
# Ersteinrichtung im Container (erster Admin und erste Firma), siehe apps/server/scripts/setup-cli.mjs.
#   docker compose -f docker-compose.prod.yml exec app ai-tpi-setup
exec node /app/apps/server/dist/setup-cli.mjs "$@"
