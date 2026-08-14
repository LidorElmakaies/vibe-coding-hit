# ADR-0011: Supabase (Postgres) for the Database

**Status:** Accepted (2026-08-14) — resolves [ADR-0008](0008-database-audit-trail-not-plain-file.md)'s
open SQL-vs-NoSQL question
**Modules:** 1 (toolbox), 7 (poses the SQL-vs-NoSQL question directly)

## Context

[ADR-0008](0008-database-audit-trail-not-plain-file.md) already settled "a database, not a plain
file" for the audit trail and past-cases list. [Module 7](../modules/module7-web-application-architecture.md)
explicitly left the SQL-vs-NoSQL choice open ("know that both exist, the choice can wait") — this
records that follow-on choice now that a stack exists to fit it into.

## Options Considered

**A. SQLite.** Zero setup, a single file — great for local dev, but not built for a real deployed
multi-user app (concurrent writes are a known weak point), and Vercel's serverless functions don't
have persistent local disk to keep a SQLite file on between requests anyway — a structural
mismatch with [ADR-0009](0009-fullstack-nextjs-typescript.md)'s deployment target.

**B. MongoDB (NoSQL).** Flexible documents, but our data is naturally relational — a case has many
advocate outputs, many verdicts, many call-log rows, each referencing the case — which is exactly
what foreign keys model directly. NoSQL would add schema-design friction for no real benefit here.

**C. Supabase (Postgres). (Chosen)** A hosted Postgres instance with no server for us to run or
patch. Relational tables fit our shape (`case` → `advocate_output` → `verdict` → `call_log`,
sketched in [`docs/architecture.md`](../architecture.md) §3) directly. It's also the course's own
recommended toolbox entry ([Module 1](../modules/module1-what-is-agentic-software-engineering.md)),
and its client library works cleanly from Next.js Route Handlers.

## Decision

Supabase (Postgres).

## Why It's Better Than the Alternatives

- Structurally compatible with serverless deployment (ADR-0009/0012) in a way SQLite is not.
- Matches the genuinely relational shape of a deliberation's data — one case, many outputs, many
  verdicts, many call-log rows — better than a document store would.
- Removes real hosting/ops burden ("keep the stack minimal," [[CLAUDE.md]] §2): no database server
  for us to provision, back up, or patch ourselves.

## Consequences

- An actual schema (columns, types, foreign keys) still needs to be written from the sketch in
  `docs/architecture.md` §3 before the backend can persist anything — not resolved by this ADR.
- Ties the project to Supabase's specific free-tier limits — acceptable for a class project's
  scale, worth revisiting only if that ever becomes a real constraint.
