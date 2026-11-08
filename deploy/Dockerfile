# Tributary control plane — Node/Vultr mode.
#
# Ships with docker-cli so the sandbox gate can spawn sibling containers via
# the mounted /var/run/docker.sock (see docker-compose.yml). The app itself
# never runs agent code — it only schedules it.
FROM node:22-alpine

RUN apk add --no-cache docker-cli

WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts
COPY . .

ENV PORT=8787 \
    HOST=0.0.0.0 \
    TRIBUTARY_SANDBOX=docker \
    TRIBUTARY_DB=/data/tributary-state.db \
    SANDBOX_IMAGE=node:22-alpine

EXPOSE 8787
CMD ["npx", "tsx", "server/index.ts"]
