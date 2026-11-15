# AI_TPI – Produktions-Container (Phase 8c, docs/06_betrieb).
# Ein Container: Der Node-Server liefert API und gebaute Weboberfläche aus, führt beim Start die
# Datenbank-Migrationen aus und läuft als unprivilegierter Nutzer „node“.
#
#   docker build -t ai-tpi .
#   docker compose -f docker-compose.prod.yml up -d
#
# NODE_IMAGE lässt sich überschreiben (z. B. ein gespiegeltes Image im Firmennetz).
ARG NODE_IMAGE=node:22-bookworm-slim

# ---------- 1) Abhängigkeiten (alle, für den Build) ----------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY apps/docs/package.json apps/docs/
COPY packages/shared/package.json packages/shared/
COPY packages/catalog/package.json packages/catalog/
# Die Dokumentationsseite (apps/docs) wird im Container nicht gebraucht.
RUN npm ci --no-audit --no-fund --ignore-scripts \
      --workspace @ai-tpi/server --workspace @ai-tpi/web --include-workspace-root

# ---------- 2) Build: Weboberfläche (Vite) und Server-Bündel (esbuild) ----------
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/server apps/server
COPY apps/web apps/web
RUN npm run build -w @ai-tpi/web && npm run build -w @ai-tpi/server

# ---------- 3) Laufzeit-Abhängigkeiten (ohne devDependencies) ----------
FROM ${NODE_IMAGE} AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY apps/docs/package.json apps/docs/
COPY packages/shared/package.json packages/shared/
COPY packages/catalog/package.json packages/catalog/
RUN npm ci --no-audit --no-fund --ignore-scripts --omit=dev --workspace @ai-tpi/server

# ---------- 4) Laufzeit ----------
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    SERVER_HOST=0.0.0.0 \
    SERVER_PORT=3000 \
    WEB_DIST_DIR=/app/web \
    RUN_MIGRATIONS=true
WORKDIR /app
# node_modules (auch evtl. verschachtelte unter apps/server) und package.json-Dateien der Arbeitsbereiche
COPY --from=prod-deps --chown=root:root /app ./
COPY --from=build --chown=root:root /app/apps/server/dist ./apps/server/dist
COPY --from=build --chown=root:root /app/apps/server/drizzle ./apps/server/drizzle
COPY --from=build --chown=root:root /app/apps/web/dist ./web
COPY --chown=root:root --chmod=0755 tools/docker/entrypoint.sh /usr/local/bin/ai-tpi-entrypoint
# Ersteinrichtung im Container: docker compose -f docker-compose.prod.yml exec app ai-tpi-setup
COPY --chown=root:root --chmod=0755 tools/docker/ai-tpi-setup.sh /usr/local/bin/ai-tpi-setup
# Der Code gehört root und ist für den Laufzeitnutzer nur lesbar.
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.SERVER_PORT||3000)+'/api/health').then(r=>r.json()).then(b=>process.exit(b.status==='ok'?0:1)).catch(()=>process.exit(1))"]
ENTRYPOINT ["/usr/local/bin/ai-tpi-entrypoint"]
