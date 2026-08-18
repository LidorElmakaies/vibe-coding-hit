# ADR-0017: MongoDB Atlas Replaces Postgres/Supabase (Supersedes ADR-0011)

**Status:** Accepted (2026-08-17) — supersedes [ADR-0011](0011-supabase-postgres-database.md)
**Modules:** 7 (database as one of the four architecture parts), 5 (minimal-footprint)

## Context

ADR-0011 settled the open engine question from [ADR-0008](0008-database-audit-trail-not-plain-file.md)
(SQL vs. NoSQL) in favor of Supabase-hosted Postgres. `backend` had already built a real SQL schema
(`lib/db/schema.ts`), query layer (`lib/db/queries.ts`), and a `pg`-based client (`lib/db/client.ts`),
with boot-time migration via `instrumentation.ts`. The user has now directly provided a MongoDB
Atlas connection string (`mongodb+srv://<db_username>:<db_password>@cluster0.ak3ciam.mongodb.net/`)
and asked to use it instead.

## Decision

**MongoDB Atlas** (a hosted, remote MongoDB cluster — not self-run) is the database engine, full
stop — not "in addition to" Postgres. `backend`'s existing SQL schema/query/client files are
replaced, not kept alongside. Collections replace tables; the official `mongodb` Node.js driver
replaces `pg` (raw driver, no ODM/Mongoose layer — consistent with [ADR-0010](0010-raw-sdk-not-langchain.md)'s
"raw SDK over a framework" reasoning, now applied to the database too).

Rough collection shape, carried over from the original table sketch (`backend` owns the real
shape): `agent_configs`, `cases`, `advocate_outputs`, `verdicts`, `call_logs` — one document per
row from the old schema; `call_logs` still needs the snapshotted prompt/model/max-tokens per
ADR-0014, now as embedded fields on the document rather than separate frozen columns.

## Why This Changes the Deployment Story Too

Atlas is a single, always-remote, already-hosted service — unlike Postgres, there's no "local
container vs. hosted instance" split to maintain. **The local Postgres container in
`docker-compose.yml` is removed entirely** (per ADR-0013); local dev and production now point at
the same kind of remote connection string (`MONGODB_URI`), the same way `OPENROUTER_API_KEY`
already worked. This is a genuine simplification, not just a swap — one fewer moving part in local
dev, and ADR-0013's "one execution model" principle applies even more literally now (same service,
not just the same container shape).

Whether local dev and production point at the *same* Atlas database or separate ones (e.g. a
different database name in the same cluster) is left to `devops`/the user to decide once real
credentials exist — noted as an open item, not decided here to avoid guessing past what's actually
been asked.

## Consequences

- **`backend` must rewrite the DB layer** — real, non-trivial work already done against Postgres
  is discarded (`lib/db/schema.ts`, `lib/db/queries.ts`, `lib/db/client.ts`, the `pg` dependency,
  the `instrumentation.ts` migration approach) and rebuilt against MongoDB's document model. The
  orchestrator (`lib/orchestrator/*`) and API routes' external contracts are unaffected — this is
  a data-layer swap, not a pipeline redesign.
- **`devops` removes the local Postgres container** from `docker-compose.yml`, updates
  `.env.example` (`MONGODB_URI` replaces `DATABASE_URL`/`POSTGRES_*`), and updates the App Runner
  env wiring accordingly.
- **Real Atlas credentials are still needed** — the connection string provided has template
  placeholders (`<db_username>:<db_password>`), not real values. Until a real username/password
  exist, nothing can actually connect; same safe-handling procedure as the AWS/OpenRouter
  credentials applies (never pasted in conversation, folded into `.env` from a file the user
  edits directly).
- **`docs/architecture.md` §3's "Database Shape" section needs a full rewrite** (SQL DDL language
  no longer applies) — done alongside this ADR.
