# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build

WORKDIR /app

ARG MIMIC_API_BASE_URL
ARG NEXT_PUBLIC_MIMIC_SENTRY_DSN
ARG NEXT_PUBLIC_MIMIC_ENVIRONMENT
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ENV MIMIC_API_BASE_URL=$MIMIC_API_BASE_URL
ENV NEXT_PUBLIC_MIMIC_SENTRY_DSN=$NEXT_PUBLIC_MIMIC_SENTRY_DSN
ENV NEXT_PUBLIC_MIMIC_ENVIRONMENT=$NEXT_PUBLIC_MIMIC_ENVIRONMENT
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN,required=false if [ -f /run/secrets/SENTRY_AUTH_TOKEN ]; then SENTRY_AUTH_TOKEN="$(cat /run/secrets/SENTRY_AUTH_TOKEN)" npm run build; else npm run build; fi

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
