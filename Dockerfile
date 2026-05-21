# Multi-stage Dockerfile for Next.js on Cloud Run
# Optimized with layer caching to avoid reinstalling dependencies

FROM node:22-alpine AS base

# Install dependencies only when package files change (cached layer)
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy only package files first for better Docker layer caching
COPY package.json package-lock.json ./

# Use npm ci with caching optimizations
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit

# Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars — pass via --build-arg or let .env.production supply them.
# NEXT_PUBLIC_* values are embedded in the client bundle and are not secret.
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SLACK_CHANNEL_NAME
ARG NEXT_PUBLIC_SLACK_CHANNEL_URL

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SLACK_CHANNEL_NAME=$NEXT_PUBLIC_SLACK_CHANNEL_NAME
ENV NEXT_PUBLIC_SLACK_CHANNEL_URL=$NEXT_PUBLIC_SLACK_CHANNEL_URL
ENV NODE_ENV="production"
ENV NEXT_TELEMETRY_DISABLED=1

# Skip tests in Docker build (they run in Cloud Build step instead)
ARG SKIP_PREBUILD=1
ENV SKIP_PREBUILD=$SKIP_PREBUILD

# Build with Next.js cache mounting for faster rebuilds
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# Production runtime
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
