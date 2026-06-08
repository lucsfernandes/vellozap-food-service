# syntax=docker/dockerfile:1.7

############################
# Stage 1 — Builder
############################
FROM node:22-alpine AS builder

WORKDIR /app

# Install build deps first so they cache independently of source changes.
# Using `npm ci` for deterministic installs based on the committed lockfile.
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json tsconfig.build.json .swcrc ./
COPY src ./src

# Compile TS -> JS into ./dist (tsc -p tsconfig.build.json).
RUN npm run build

############################
# Stage 2 — Runtime
############################
FROM node:22-alpine AS runtime

# dumb-init handles SIGTERM correctly so graceful shutdown actually fires.
# wget (ships with busybox on alpine) is used by the HEALTHCHECK.
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production \
    PORT=3333

WORKDIR /app

# Full dependency install (incl. devDeps) is required so the migrate Job can
# load TS migrations through @swc-node/register at runtime. The app itself only
# needs the runtime deps, but keeping a single image avoids a second build.
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund && npm cache clean --force

# Compiled app.
COPY --from=builder /app/dist ./dist
# Migrations + entities are TS and are loaded by @swc-node/register via the
# migrate Job (scripts/migrate.ts). Copy the TS source + swc config so the Job
# can run `node --import @swc-node/register/esm-register scripts/migrate.ts run`.
COPY src ./src
COPY scripts ./scripts
COPY tsconfig.json tsconfig.build.json .swcrc ./

# Run as the unprivileged "node" user (uid 1000) that ships with the base image.
# Matches the Deployment securityContext (runAsUser: 1000, readOnlyRootFilesystem).
USER node

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3333/api/health > /dev/null || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
