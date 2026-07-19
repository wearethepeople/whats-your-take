# Multi-stage build: install deps, build the app, then a slim runtime image
# with the Litestream binary for continuous SQLite replication.

# Pinned per contract: must stay outside the v0.5.6–v0.5.7
# silent-failure range.
ARG LITESTREAM_VERSION=0.5.14

FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM node:24-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev

FROM node:24-slim
ARG LITESTREAM_VERSION
WORKDIR /app
ENV NODE_ENV=production

# sqlite3 CLI stays in the image: the pre-event restore drill and on-machine
# inspection (docs/deploy.md) depend on it.
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates sqlite3 wget \
  && wget -qO /tmp/litestream.deb "https://github.com/benbjohnson/litestream/releases/download/v${LITESTREAM_VERSION}/litestream-${LITESTREAM_VERSION}-linux-x86_64.deb" \
  && dpkg -i /tmp/litestream.deb \
  && rm /tmp/litestream.deb \
  && apt-get purge -y wget && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY package.json ./
COPY drizzle ./drizzle
COPY other/migrate.js ./other/migrate.js
COPY other/litestream.yml /etc/litestream.yml
COPY other/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 8080
CMD ["./entrypoint.sh"]
