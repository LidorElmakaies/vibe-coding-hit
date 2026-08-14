# Decision Records — agnet-project

This folder is the project's **planning record**: for each major decision, what we considered,
what we picked, and why it beats the alternatives — not just the conclusion. It exists so the
reasoning behind the build is visible in the repo itself, not only in conversation.

Format: [Architecture Decision Records](https://adr.github.io/) (ADR) — one file per decision,
numbered in the order they were made. Each covers **Context** (what forced the decision),
**Options Considered** (genuine alternatives, with real pros/cons — not a strawman), **Decision**,
**Why It's Better Than the Alternatives**, and **Consequences** (what the choice costs, not just
what it buys).

**Not every choice gets an ADR.** A decision earns one when there were real alternatives with
real tradeoffs to weigh — teacher-mandated constraints (the 2-defense/2-prosecution/3-judge shape,
all 7 system prompts being teacher-provided) aren't choices we made, so they're recorded as facts
in [`docs/decisions-log.md`](../decisions-log.md) and [`CLAUDE.md`](../../CLAUDE.md) instead.

## Index

| # | Decision | Status |
|---|---|---|
| [0001](0001-openrouter-as-llm-provider.md) | Use OpenRouter as the LLM provider (vs. a direct provider API or a framework like LangChain) | Accepted |
| [0002](0002-multi-file-documentation-structure.md) | Split project docs into many small files, not one big one | Accepted, later confirmed by Module 11 |
| [0003](0003-repo-local-memory-only.md) | Keep all assistant memory inside the repo, not Claude Code's global store | Accepted |
| [0004](0004-single-shot-independent-agents.md) | Single-shot, independent agent calls — no multi-turn debate | Accepted |
| [0005](0005-reusable-web-app-not-one-off-script.md) | Build a reusable web app ("the Tribunal"), not a one-off script over one case | Accepted, confirmed with the user |
| [0006](0006-topic-split-engineering-rules.md) | Split engineering rules by topic instead of one flat list | Accepted |
| [0007](0007-parallel-calls-and-prompt-caching.md) | Run independent calls in parallel; cache the shared case text | Accepted |
| [0008](0008-database-audit-trail-not-plain-file.md) | Persist the audit trail in a database, not a plain log file (SQL vs. NoSQL still open) | Proposed — direction chosen, engine settled by 0011 |
| [0009](0009-fullstack-nextjs-typescript.md) | Next.js (TypeScript), web only — not React Native, not a separate Python/Node backend | Accepted |
| [0010](0010-raw-sdk-not-langchain.md) | Raw `openai` SDK against OpenRouter, not LangChain/LangGraph/Vercel AI SDK | Accepted |
| [0011](0011-supabase-postgres-database.md) | Supabase (Postgres) — resolves 0008's open engine question | Accepted |
| [0012](0012-vercel-deployment.md) | Deploy to Vercel, not the course-default Netlify | **Superseded by 0013** |
| [0013](0013-docker-compose-local-render-production.md) | Docker Compose for local dev; Render for future production hosting (both via one Dockerfile) | Accepted |

## Still-Open Decisions (not yet ADRs, because not yet decided)

These are real forks we haven't closed — see [`CLAUDE.md`](../../CLAUDE.md) §6 for the live list.
Once each is actually decided, it should either become a numbered ADR here (if it involved real
alternatives) or a `docs/decisions-log.md` entry (if it was simply learning a new constraint):

- Whether to vary the OpenRouter model per call, or keep one shared model.
- Exact hard-cap value for calls-per-deliberation.
- The actual Render service configuration, once production hosting stops being future work.
