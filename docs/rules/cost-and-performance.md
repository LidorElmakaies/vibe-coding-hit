# Rules — Cost & Performance

> Part of the split-out rule set — see [`CLAUDE.md`](../../CLAUDE.md) §2 for the pointer. All new
> from [Module 9](../modules/module9-cognified-software-and-agent-economics.md), which gives real
> numbers for our exact 7-call shape: ~17,000 tokens and ~21s sequential / ~6s parallelized per
> full deliberation.

- **Run independent calls in parallel — never serialize what doesn't depend on anything.** The 4
  advocate calls don't depend on each other or on anything but the case: call them at once. The 3
  judge calls don't depend on each other either, only on all 4 advocate outputs existing first:
  call them at once, after the advocates finish. Sequential-everything for 7 calls costs ~21s;
  done this way it costs ~6s.

- **Use prompt caching for the shared charge sheet.** All 7 calls (4 advocates + 3 judges) read
  the same case text — that's exactly the kind of large, repeated block caching is for.
  **Implemented 2026-08-18** (`lib/orchestrator/bundle.ts`/`callAgent.ts`, OpenRouter's
  `cache_control` extension) and live-verified against real OpenRouter calls — see
  [`docs/cost-budget.md`](../cost-budget.md) §7 for exactly what was verified, including a real
  caveat found in testing: same-stage parallel calls (the 4 advocates at once, the 3 judges at
  once) generally each write their own cache entry rather than one writing and the rest reading it,
  so "pay for it once, reuse it across the run" doesn't hold as cleanly *within one run's parallel
  stage* as the original wording here implied — still a real saving, just not that exact shape.

- **Cap calls-per-deliberation — bound the economic blast radius.** A loop can spend faster than
  anyone is watching; set a hard limit on how many model calls a single run may make. **Resolved:**
  up to 2 retries per call (3 attempts), 21 OpenRouter calls hard ceiling per run — see
  [`docs/cost-budget.md`](../cost-budget.md) §5 for the reasoning and the per-agent token budget
  that goes with it.

- **Cost is architecture, not accounting — decide it up front.** Judges cost the most per run
  (each reads all 4 advocate outputs). Cost grows faster than agent count, so adding a 5th
  advocate or a 4th judge isn't a free move — treat it as a real cost decision, not a tweak.
