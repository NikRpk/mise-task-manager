# Multi-stage Dockerfile for Next.js on Cloud Run
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time env vars (will be embedded in client bundle)
ENV NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyAfzXqbXpP-XqbrQCo72WDquWd8Yiu-gBY"
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="dach-ai-mvps.firebaseapp.com"
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID="dach-ai-mvps"
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="dach-ai-mvps.firebasestorage.app"
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="1014309748045"
ENV NEXT_PUBLIC_FIREBASE_APP_ID="1:1014309748045:web:5bba4f0910e8f556ffcb04"
ENV NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-HJL2Y0VRXJ"
ENV NODE_ENV="production"
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

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
