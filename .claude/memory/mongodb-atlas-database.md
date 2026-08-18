---
name: mongodb-atlas-database
description: Database engine changed from Postgres/Supabase to MongoDB Atlas (2026-08-17, ADR-0017) - discarded already-built SQL work
metadata:
  type: project
---

agnet-project's database is **MongoDB Atlas** (hosted, remote), not Supabase/Postgres. User
provided a real Atlas connection string directly and asked for the switch — a deliberate,
same-day reversal of [ADR-0011](../../docs/decisions/0011-supabase-postgres-database.md), even
though `backend` had already built a complete, working SQL data layer against Postgres earlier
that day (`lib/db/schema.ts`, `lib/db/queries.ts`, `lib/db/client.ts`, boot-time migration via
`instrumentation.ts`). That work is discarded, not kept alongside — see
[ADR-0017](../../docs/decisions/0017-mongodb-atlas-database.md) for full reasoning.

**Why this matters going forward:** don't assume the DB layer is "already done" from earlier in
this project's history — if you see references to `pg`, SQL schema files, or Postgres-specific
code, they're stale/superseded. The real, current data layer uses the official `mongodb` Node
driver (no ODM/Mongoose — consistent with ADR-0010's raw-SDK philosophy applied to the DB too),
against collections: `agent_configs`, `cases`, `advocate_outputs`, `verdicts`, `call_logs`.

**Deployment simplification that came with this**: since Atlas is always-remote, the local
Postgres container in `docker-compose.yml` was removed entirely — local dev and production now
point at the same kind of connection string (`MONGODB_URI`), the same pattern already used for
`OPENROUTER_API_KEY`. One fewer moving part than the old local-container-vs-hosted-instance split.

**Credential handling note:** the real Atlas username/password arrived via a direct chat message
(not a file), unlike the AWS/OpenRouter keys which the user placed in a gitignored `.env` for
extraction without ever being displayed. Flagged to the user that this channel is less protected
and the password is worth rotating — the value itself is not repeated here or anywhere else beyond
`.env`'s `MONGODB_URI` line.

**How to apply:** Read [ADR-0017](../../docs/decisions/0017-mongodb-atlas-database.md) before
touching any DB code. `docs/architecture.md` §3 has the current (document-based) shape. Whether
local dev and production share one Atlas database or use separate ones is still an open item, not
decided — see `docs/architecture.md` §6. Related: [[aws-app-runner-production]],
[[editable-agent-config-scope-change]].
