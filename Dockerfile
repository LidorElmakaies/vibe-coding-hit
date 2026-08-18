# One image, used both locally (docker-compose.yml) and on AWS App Runner in production — see
# ADR-0013 (docs/decisions/0013-docker-compose-local-render-production.md, local half still
# accurate) and ADR-0016 (docs/decisions/0016-aws-app-runner-production.md, supersedes Render for
# production). Next.js standalone output mode so the runtime image doesn't need the full
# node_modules tree or source.
#
# STATUS (devops agent, 2026-08-17): build-tested against the real scaffold via `docker build`.
# node:22-alpine (not 20) because the `openai` SDK dependency requires Node >=22.
#
# No secret is ever COPYd or ARG'd into this image — OPENROUTER_API_KEY and DATABASE_URL reach the
# running container only via `docker compose`'s env_file/environment locally (see
# docker-compose.yml), or App Runner's environment configuration in production. Never baked into a
# layer.

FROM node:22-alpine AS base

# ---- deps: install dependencies only, in their own layer for caching ----
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- builder: build the Next.js app ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner: minimal runtime image, no source/build tooling ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone output: a self-contained server.js + the minimal node_modules subset it needs.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# HOSTNAME is forced inline on the actual command, not just left as an image-level ENV default,
# because AWS App Runner injects its own HOSTNAME env var at container runtime (the platform's
# internal EC2 hostname, e.g. ip-10-0-x-x.ec2.internal) which overrides the image's ENV default —
# a known Next.js-standalone-mode collision. Without this, the standalone server binds to that
# platform hostname instead of 0.0.0.0, so App Runner's own TCP health check against the
# container's port can never reach it, and the service permanently fails to go healthy
# (CREATE_FAILED). Setting it inline on CMD can't be overridden by an injected env var the same
# way, since it's part of the exact command that runs. Confirmed via CloudWatch logs 2026-08-17.
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 node server.js"]
