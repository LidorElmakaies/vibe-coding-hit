# ADR-0001: Use OpenRouter as the LLM Provider

**Status:** Accepted (2026-08-12)
**Modules:** 1 (toolbox), 9 (agent economics)

## Context

Every agent call in this project (4 advocates + 3 judges) needs to reach an LLM. We need to pick
how those calls are made: which API, and whether we lock to one model provider or stay flexible.

## Options Considered

**A. Call OpenAI's API directly.**
Simple, one integration, good docs. But locks the whole project to one model family — if a call
turns out to need a different model (e.g. a cheaper one for a one-sided advocate argument, a more
capable one for a hard judge ruling, per [Module 9](../modules/module9-cognified-software-and-agent-economics.md)'s
"match capability to difficulty"), we'd need a second integration from scratch, not a config
change.

**B. Call Anthropic's API directly.**
Same shape of tradeoff as A — good docs, single-provider lock-in, no easy path to mixing models
without adding a second SDK later.

**C. Use an orchestration framework (e.g. LangChain) that wraps multiple providers.**
Gets multi-provider flexibility, but adds a real dependency and abstraction layer on top of what
is, for us, 7 straightforward request/response calls with no chains, agents-calling-tools, or
retrieval — the framework's actual value (complex chains, memory, tool orchestration) isn't
needed here, and it works against the "keep the stack minimal" rule ([[CLAUDE.md]] §2).

**D. Use OpenRouter — a single API that routes to many providers/models. (Chosen)**
One integration, one API key, one billing surface — but keeps the ability to pick a different
model per call (or per stage) purely through configuration, no new integration required. This
directly serves [Module 9](../modules/module9-cognified-software-and-agent-economics.md)'s
guidance to match each call's model to its actual difficulty rather than defaulting one model
everywhere.

## Decision

OpenRouter, for all 7 agent calls.

## Why It's Better Than the Alternatives

- Vs. A/B: doesn't lock us to one model family, so a later decision to use a cheaper model for
  advocates and a stronger one for judges (an open question — see [[CLAUDE.md]] §6) is a config
  change, not a new integration.
- Vs. C: no framework overhead for work that's genuinely just 7 independent request/response
  calls — matches the "keep the stack minimal" constraint directly.
- The course's own recommended toolbox lists OpenRouter as the default for exactly this reason
  (see [Module 1](../modules/module1-what-is-agentic-software-engineering.md)).

## Consequences

- One more external dependency (OpenRouter itself) sitting between us and the model providers —
  accepted as a reasonable tradeoff for the flexibility gained.
- The OpenRouter key is the single secret that must never reach the browser — see
  [`docs/rules/security-and-permissions.md`](../rules/security-and-permissions.md).
