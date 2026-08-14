# ADR-0009: Next.js (TypeScript) as the Full-Stack Framework, Web Only

**Status:** Accepted (2026-08-14)
**Modules:** 7 (browser/backend split), 5 (minimal-footprint)

## Context

The confirmed architecture ([ADR-0005](0005-reusable-web-app-not-one-off-script.md)) needs a
browser: a case-submission form, a results view, a past-cases list, talking to a backend that
holds the OpenRouter key and orchestrates 7 model calls. Two coupled questions needed answering:
what renders the UI, and what language/runtime the backend runs on.

## Options Considered

### Frontend
**A. React Native (+ `react-native-web`).** Originally preferred, for its component model. But
React Native's actual target is native mobile apps (iOS/Android) — running it in a browser needs
a compatibility layer that adds a translation step this project doesn't need, since no mobile app
is actually in scope (confirmed with the user this session).

**B. Plain React (Vite).** Simplest fit for exactly three screens and no complex client state.

**C. Next.js. (Chosen)** Same React component model as B, plus file-based routing that maps
directly onto the three screens, and — the deciding factor — it can hold the backend too (see
below), collapsing two separate projects into one.

### Backend language
**A. Python + FastAPI.** Deepest AI-ecosystem, but a second language and no shared types with a
React-family frontend.

**B. Node.js + TypeScript. (Chosen)** Same language as the frontend — shared types between the
charge-sheet form and the API that receives it, one dependency tree, one mental model for a
project explicitly meant to stay small. `Promise.all` fits the parallel advocate/judge fan-out
from [ADR-0007](0007-parallel-calls-and-prompt-caching.md) directly.

### Backend framework, given B
Once Node.js/TypeScript + Next.js are both chosen, they resolve each other: **Next.js Route
Handlers serve as the backend** — no separate Express/Fastify/FastAPI process, one project, one
`npm install`, one deploy target.

## Decision

Next.js, TypeScript, App Router, web only. Route Handlers under `app/api/` hold all backend logic
(never exposed to the client) — see [`docs/architecture.md`](../architecture.md) for the request
cycle mapped onto this.

## Why It's Better Than the Alternatives

- Directly serves "keep the stack minimal" ([[CLAUDE.md]] §2): one project instead of two, one
  language instead of two, one deploy instead of two.
- React Native's compatibility layer for web would have added real complexity in service of a
  mobile-app capability this project doesn't need — picking it would have been optimizing for a
  requirement that doesn't exist.
- TypeScript end-to-end means the charge-sheet shape, the advocate/judge output shape, and the
  verdict shape can be one set of shared types, not two independently-maintained ones.

## Consequences

- Commits the project to the Node/npm ecosystem for the agent-calling library choice too — see
  [ADR-0010](0010-raw-sdk-not-langchain.md).
- If a real mobile app ever becomes in-scope later, it would need a separate build (React Native)
  or a wrapper (e.g. Capacitor) — accepted as out of scope per `docs/framing.md` §4.
