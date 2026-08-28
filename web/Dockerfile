FROM node:22-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build

WORKDIR /app

ARG MIMIC_API_BASE_URL
ARG NEXT_PUBLIC_MIMIC_SENTRY_DSN
ENV MIMIC_API_BASE_URL=$MIMIC_API_BASE_URL
ENV NEXT_PUBLIC_MIMIC_SENTRY_DSN=$NEXT_PUBLIC_MIMIC_SENTRY_DSN

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app

COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static

USER node

CMD ["node", "server.js"]
