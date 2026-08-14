# ADR-0004: Single-Shot, Independent Agent Calls — No Multi-Turn Debate

**Status:** Accepted (2026-08-12)
**Modules:** 1, 3 (context window mental model), 9 (agent economics)

## Context

The assignment fixes the *shape* (2 defense, 2 prosecution, 3 judges), but not how each agent call
is run. The real design question was: does each advocate/judge get one single-shot call, or do
they converse — with each other, or across multiple turns before answering?

## Options Considered

**A. A real back-and-forth: advocates respond to each other, judges can ask follow-ups.**
Closer to an actual courtroom. But per [Module 3](../modules/module3-mental-models-of-agents.md)'s
context-window mental model, every additional turn means every later call carries more accumulated
context — cost and latency grow with turn count, not just agent count, and a bad early turn can
poison every later one silently (the model "fills gaps silently" rather than flagging them).
[Module 9](../modules/module9-cognified-software-and-agent-economics.md)'s own numbers make the
cost concrete: even 7 single-shot calls already spend ~17,000 tokens; a multi-turn version would
multiply that per round, with no stated bound.

**B. Advocates see each other's arguments before finalizing (one shared context, still one call
each).**
Reduces near-duplicate arguments by letting each advocate "see" what's already been said. But it
breaks a real independence guarantee: an advocate's output would then depend on *call order*, not
just on the case and its own prompt — makes the pipeline non-deterministic in an unaccountable way
and harder to audit (which output caused which — see [Module 4](../modules/module4-anatomy-of-agentic-workflow.md)'s
audit-trail reasoning).

**C. Every call is single-shot and independent — advocates never see each other; judges see only
the finished bundle. (Chosen)**
Matches the assignment's own description most literally, and keeps every one of the 7 calls
genuinely independent and reproducible in isolation.

## Decision

Option C — see [[CLAUDE.md]] §2's pipeline diagram.

## Why It's Better Than the Alternatives

- Cost and latency stay bounded and predictable (Module 9's ~17k tokens / ~6s-parallelized figures
  are for exactly this shape — a multi-turn design has no such fixed bound).
- Each of the 7 outputs is independently attributable: a bad output traces to one call, one prompt,
  one context — not to an accumulated, hard-to-audit conversation state.
- It keeps the judges' role meaningful: they're independently weighing 4 arguments that were
  produced without knowledge of each other, closer to how the assignment describes the exercise,
  rather than arguments that already anticipated and hedged against one another.

## Consequences

- Advocates can't "respond" to weaknesses in the opposing side's argument — accepted as in-scope
  for this exercise (see `docs/framing.md` §4, out-of-scope: multi-turn debate).
- If two advocate outputs on the same side turn out to read as near-duplicates, there's no
  mechanism to have them differentiate after the fact — see `docs/framing.md` §3, item 1, which
  treats that as the teacher's prompt-authorship responsibility (all 7 system prompts are
  teacher-provided, not ours — see the 2026-08-14 entry in `docs/decisions-log.md`), not something
  to patch at runtime.
