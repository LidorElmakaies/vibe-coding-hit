# ADR-0012: Deploy to Vercel

**Status:** ~~Accepted~~ **Superseded by [ADR-0013](0013-docker-compose-local-render-production.md)
(2026-08-14, same day)** — the user specified Docker Compose for local dev and Render for future
hosting, which this ADR's own Option B had actually named as the natural fit for a traditional
long-running server. Kept here, unedited, as the historical record of the reasoning that held until
that instruction — the point of `docs/decisions/` is to show real direction happening, including a
same-day course correction, not to erase what came before it.
**Modules:** 1 (toolbox lists Netlify as course default), 7 (deployment "earns respect" — mistakes
reach everyone at once once deployed)

## Context

The course's own recommended default is Netlify. That default was set before this project's stack
was chosen; worth checking it still fits now that the stack is Next.js specifically.

## Options Considered

**A. Netlify (course default).** Excellent for static sites + serverless functions, but Next.js
support is via an adapter rather than native — more friction than necessary given the alternative.

**B. Render / Railway.** Natural fit for a traditional long-running server (e.g. if the backend had
been separate FastAPI/Express) — but that's not this project's shape anymore
([ADR-0009](0009-fullstack-nextjs-typescript.md) collapsed frontend+backend into one Next.js app).

**C. Vercel. (Chosen)** Built by the same team as Next.js — first-class support with zero
configuration, including Route Handlers as serverless functions automatically. Generous free tier
fits a class project's scale.

## Decision

Vercel.

## Why It's Better Than the Alternatives

Once [ADR-0009](0009-fullstack-nextjs-typescript.md) picked Next.js specifically, Vercel stopped
being "a deployment option among several" and became the one built for exactly this framework —
zero-config deploy, automatic serverless functions for the Route Handlers, no adapter layer to
reason about. Deviating from the course's Netlify default here isn't ignoring the course's
guidance — Module 1 itself frames the toolbox list as "recommendations, not requirements," and
this is a case where the actual stack choice (driven by Modules 5, 7, and 9's reasoning) points
somewhere more specific.

## Consequences

- One more course-recommended default not used, alongside LangChain (ADR-0010) — both deviations
  are documented with reasoning here rather than silently diverging, which is the point of this
  whole `docs/decisions/` folder.
- Module 7's point that deployment "earns respect" (a mistake reaches everyone at once) still
  applies regardless of platform — see `docs/rules/audit-and-reliability.md` for how failures are
  handled once live.
