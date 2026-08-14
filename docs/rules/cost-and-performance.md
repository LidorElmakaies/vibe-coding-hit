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
  the same case text — that's exactly the kind of large, repeated block caching is for. Pay for it
  once, reuse it across the run.

- **Cap calls-per-deliberation — bound the economic blast radius.** A loop can spend faster than
  anyone is watching; set a hard limit on how many model calls a single run may make. *(Exact cap
  value: open, see `CLAUDE.md` §6.)*

- **Cost is architecture, not accounting — decide it up front.** Judges cost the most per run
  (each reads all 4 advocate outputs). Cost grows faster than agent count, so adding a 5th
  advocate or a 4th judge isn't a free move — treat it as a real cost decision, not a tweak.
