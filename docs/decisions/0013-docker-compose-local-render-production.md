# ADR-0013: Docker Compose for Local Dev, Render for Future Production Hosting

**Status:** Accepted (2026-08-14) — supersedes [ADR-0012](0012-vercel-deployment.md). **Its
production-hosting half (Render) is superseded by [ADR-0016](0016-aws-app-runner-production.md)
(2026-08-17) — the user moved production hosting to AWS App Runner instead.** The local Docker
Compose decision and reasoning below are unaffected and still current.
**Modules:** 7 (deployment "earns respect"), 5 (minimal-footprint — reconsidered below)

## Context

[ADR-0012](0012-vercel-deployment.md) picked Vercel on the reasoning that it's the natural,
zero-config home for a Next.js app. That reasoning was sound on its own terms, but it optimized for
one thing (least deploy friction) at the cost of another the user actually wants: a **local
environment that matches production**, run via Docker Compose, with **Render** as the actual
production target once the project is ready to host — not Vercel.

## Options Considered

**A. Stay on Vercel (ADR-0012).** Zero-config, but Vercel's model is "push to its build system,"
not "run the container you built locally" — there's no meaningful Docker Compose story for local
dev that mirrors a Vercel deploy, since Vercel doesn't run your Dockerfile as the deployment
artifact the way Render does. Local dev and production would use two different execution models.

**B. Docker Compose locally + Render for production. (Chosen)** One Dockerfile, one execution
model, used both locally (`docker compose up`) and in production (Render deploys straight from a
Dockerfile as a Web Service). What runs on your machine is structurally the same thing that runs in
production — not an approximation of it.

**C. Docker Compose locally + Vercel for production anyway.** Rejected: this would mean maintaining
two different deployment shapes (a container locally, a serverless build on Vercel) that could
drift from each other — the opposite of what "match local to production" is for.

## Decision

Docker Compose for local development now; Render for production hosting **once the project is
ready to be hosted** (explicitly a future step, not immediate — see Consequences). A single
Dockerfile is the deployment artifact for both.

## Why It's Better Than the Alternative

- **One execution model, not two.** The container that runs locally via Compose is the same
  artifact Render would run — no separate "how does this behave differently in production" class
  of bug to debug blind.
- **Render deploys a Dockerfile directly** — no adapter layer, similar in spirit to why ADR-0012
  originally preferred Vercel's native Next.js support; the difference is which artifact is
  "native": a container, not a framework-specific build pipeline.
- Local Postgres can run as a plain container in the same `docker-compose.yml` — this project
  doesn't use Supabase's auth/storage features (see `docs/framing.md` §4, no-auth out-of-scope), so
  a plain Postgres container is a reasonable local stand-in without needing the full Supabase local
  stack, keeping this consistent with "keep the stack minimal."

## Consequences

- **More local setup than `next dev` + a hosted Supabase instance** — Docker Desktop (or equivalent)
  becomes a real prerequisite, and a `Dockerfile` + `docker-compose.yml` need writing and
  maintaining. This is a deliberate tradeoff the user made in favor of local/production parity, not
  an oversight against "keep the stack minimal" — worth naming explicitly since it does add moving
  parts.
- **Production hosting on Render is future work, not current scope.** Nothing about this ADR
  commits to a Render deploy happening now — only that *when* it happens, it should be a Dockerfile
  deploy on Render, not a Vercel build. Tracked as an open item in [[CLAUDE.md]] §6.
- Local Postgres (plain container) vs. hosted Supabase's managed Postgres (ADR-0011) need to be
  reconciled in the connection-string/config layer so the same code works against either — the
  devops agent owns this.
- [ADR-0011](0011-supabase-postgres-database.md) (Supabase/Postgres for the database engine) is
  unaffected by this — it's still Postgres either way; only *where* it runs (local container vs.
  hosted Supabase) changes between environments.
