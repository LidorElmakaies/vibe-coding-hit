# ADR-0010: Raw `openai` SDK Against OpenRouter, Not LangChain

**Status:** Accepted (2026-08-14)
**Modules:** 5 (minimal-footprint), 4/8 (audit-trail legibility), 9 (agent economics)

## Context

All 7 model calls need to actually reach OpenRouter. The user's original preference was LangChain,
specifically for its agent-management conveniences. Worth checking that preference against what
this project's calls actually require: per [[CLAUDE.md]] §2, every one of the 7 calls is
single-shot, with no tool use and no shared memory between them.

## Options Considered

**A. LangChain (`langchain` / `@langchain/openai`).** Gives a unified interface across model
providers, structured-output parsing (Zod/Pydantic schemas — could directly enforce "a judge
returns a fixed verdict shape, never prose," the exact failure named in
[Module 10](../modules/module10-specification-and-co-evolution-spiral.md)/[11](../modules/module11-context-engineering.md)),
and real pedagogical value for a course specifically about agentic software engineering. But
LangChain's actual differentiators — chains, agent loops, memory, retrievers, tool orchestration —
are precisely the things this project's own rules say we don't have. It also inserts an
abstraction layer between the code and the raw request/response, working slightly against the
audit-trail legibility goal ([Module 4](../modules/module4-anatomy-of-agentic-workflow.md)/[8](../modules/module8-interface-design-and-documentation.md)):
what actually gets logged should be exactly what was sent and received, with no framework layer to
account for.

**B. LangGraph.** Built for genuine multi-step, branching agent state machines. Even heavier than
LangChain for a pipeline that is two flat parallel stages with no branching. Not a real contender.

**C. Vercel AI SDK.** A real middle ground for a Node.js project specifically — structured output
and a unified provider interface without chain/agent/memory weight. Reasonable, but still an
added dependency for something 7 fetch calls can do directly.

**D. The official `openai` SDK, pointed at OpenRouter's OpenAI-compatible base URL (or plain
`fetch`). (Chosen)** OpenRouter explicitly supports this — same request/response shape as calling
OpenAI directly, just a different `baseURL` and API key. Zero framework weight beyond a single,
well-known, minimal client library. Structured output is available directly via `response_format`
without needing LangChain's wrapper. What's sent and received is exactly what's logged — no
translation layer to reason about when debugging or auditing a run.

## Decision

Option D — the official `openai` npm package, configured with OpenRouter's base URL and API key.

## Why It's Better Than the Alternatives

- Matches [Module 5](../modules/module5-ade-typology.md)'s minimal-footprint principle literally:
  grant/adopt only what the task requires. This task requires "send a prompt, get a completion" —
  seven times, independently. Nothing here calls for chain orchestration.
- Maximizes audit-trail transparency ([ADR](../decisions-log.md) and
  [`docs/rules/audit-and-reliability.md`](../rules/audit-and-reliability.md)): the persisted
  call-log record is a direct copy of what the SDK actually sent/received, not a summary of what a
  framework did on our behalf.
- Structured output (needed for judges to return a fixed verdict shape, not prose) works the same
  either way — LangChain doesn't provide something the raw SDK lacks here.

## Consequences

- Retry/fallback logic (per the Module 9 rule: never let a malformed response pass through
  silently) has to be hand-written rather than inherited from a framework — a small, explicit
  amount of code, tracked in
  [`docs/documentation-brief-backend-orchestrator.md`](../documentation-brief-backend-orchestrator.md).
- If a future need for real multi-step agent behavior emerges (not expected, given the assignment's
  fixed shape), this decision would need revisiting — noted here rather than pre-solved.
