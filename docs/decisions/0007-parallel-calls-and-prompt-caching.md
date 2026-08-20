# ADR-0007: Run Independent Calls in Parallel, With Prompt Caching on the Shared Case

**Status:** Accepted (2026-08-14)
**Modules:** 9 (agent economics)

## Context

A full deliberation is 7 model calls (4 advocates + 3 judges), each reading the case; judges also
read all 4 advocate outputs. How those 7 calls are sequenced, and whether repeated content is
resent every time, is a real design choice with a real cost/latency impact —
[Module 9](../modules/module9-cognified-software-and-agent-economics.md) gives exact figures for
this project's own shape.

## Options Considered

**A. Fully sequential — call 1 → 2 → 3 → ... → 7, one after another, no caching.**
Simplest to reason about and implement first. Module 9's own number for this exact shape: **~21
seconds** per deliberation, and the full case text re-sent (and billed) on all 7 calls
independently.

**B. Parallelize within each dependency stage; cache the shared case text. (Chosen)**
The 4 advocates don't depend on each other or on anything but the case — call them at once. The 3
judges don't depend on each other either, only on all 4 advocate outputs existing — call them at
once, after. The case text is identical across all 7 calls, which is exactly what prompt caching
is for. Module 9's figure for this shape done this way: **~6 seconds**.

**C. Parallelize everything, including judges before advocates finish.**
Rejected outright, not just deprioritized — judges structurally require the full advocate bundle
first (see [[CLAUDE.md]] §2's "judges must receive the full bundle" constraint); running them
early would mean judging on incomplete or fabricated input.

## Decision

Option B — two parallel stages (4 advocates, then 3 judges), with prompt caching on the shared
case text. See `docs/architecture.md` §2 for the diagram.

## Why It's Better Than the Alternatives

- ~6s vs. ~21s for identical work — a ~3.5x latency reduction from sequencing alone, with zero
  change to what's actually asked of the model.
- Caching the case avoids re-billing the same tokens 7 times: it's exactly the case Module 9
  describes as "a large shared prompt" that "saves the most" from caching.
- Preserves the assignment's own dependency structure (judges need the full bundle) rather than
  trading correctness for speed (ruling out Option C).

## Consequences

- The backend needs to actually implement two-stage parallel dispatch (a `Promise.all`-style
  fan-out, or the equivalent in whatever language gets picked — see open question in
  [[CLAUDE.md]] §6) rather than a simple for-loop — slightly more orchestration code than Option A.
- Partial-failure handling gets slightly more involved with parallel calls (which of the 4 failed,
  independently of the others) — already covered by
  [`docs/rules/audit-and-reliability.md`](../rules/audit-and-reliability.md)'s failure-visibility
  rule, but worth noting as a direct consequence of this choice.

## Update (2026-08-18): caching implemented, and a real tension found between the two halves of this ADR

Prompt caching was actually implemented (it had been described here and in `docs/cost-budget.md`/
`docs/rules/cost-and-performance.md` since this ADR's original acceptance, but not built until now
— see `specs/agent-pipeline.md`'s discrepancy note, which flagged the gap). Built per OpenRouter's
verified request format (`cache_control` on a content block), in
`lib/orchestrator/bundle.ts`/`callAgent.ts`.

Live testing against real OpenRouter calls surfaced something this ADR's original "Why It's Better"
section didn't anticipate: **this decision's own two halves work against each other within a single
run.** "Caching the case avoids re-billing the same tokens 7 times" assumed the 4 (or 3) same-stage
calls would share one cache write. In practice, dispatching them via `Promise.all` — exactly what
this ADR's Option B requires for the ~6s latency figure — means they each reach the provider close
enough in time that, in a real controlled test, all 3 parallel judge calls independently *wrote*
their own cache entry rather than one writing and the others reading it. Caching still works
correctly (verified: an isolated, deliberately non-parallel pair of calls showed a real write-then-
hit with an ~11x cost drop on the second call) — it just doesn't reliably fire *between siblings of
the same parallel stage*, only for calls that aren't racing each other (retries, later calls to the
same model outside the same instant, a later run of a similar case within the cache TTL).

This isn't grounds for revisiting the parallelization choice — the latency win is real, large, and
was the actual point of Option B; a full case-by-case audit of whether every combination of
caching-across-siblings-within-a-parallel-stage is worth serializing for was out of scope here, and
`docs/cost-budget.md`'s own numbers already frame the caching saving as cents, not dollars, next to
a 3.5x latency win. Recorded here so the tension is visible to whoever revisits this ADR, rather
than left as a silent gap between what was decided and what was actually true. Full verification
detail: `docs/cost-budget.md` §7.
