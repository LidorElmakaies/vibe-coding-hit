# Rules — Audit Trail & Reliability

> Part of the split-out rule set — see [`CLAUDE.md`](../../CLAUDE.md) §2 for the pointer.

- **Every pipeline run needs an audit trail.** Each run (4 advocate calls + 3 judge calls) must
  produce a frozen record linking intent → specification/system-prompt used → context handed in →
  actual output → verification applied. Not satisfied by "it printed to the console." Concretely,
  persist per call: **model, output, token counts, cost, time** — plus the case and the resulting
  output, so a past run can be found and re-read later via the past-cases list. *(Modules 4, 7)*

- **The total tokens used per run must be calculated from real OpenRouter data and persisted, not
  estimated.** Every OpenRouter response already includes a `usage` object — sum it across the
  run's calls (7, or more with retries) rather than inventing a separate mechanism. This is a
  project goal, not just a nice-to-have — see [`docs/cost-budget.md`](../cost-budget.md) §6 and
  `docs/framing.md` §3 item 7. The testing agent's job includes confirming the stored total
  actually equals the sum of the real per-call values.

- **A model failure must never silently pass through as a real output.** Check the shape of the
  response before trusting it; retry or fall back; if it still fails, render the failure as a
  visible failure state — never as a defaulted answer that could be mistaken for a real verdict.
  The named anti-pattern: a malformed judge response must never silently read as e.g. "not
  guilty." The subtler case — a fluent, well-formed answer resting on facts that aren't actually
  there — can't be caught by a shape/format check alone; it needs the content itself read against
  the source. *(Modules 8, 9)*

- **Judges must receive the full bundle (case + all 4 advocate outputs), never a partial view.** A
  project-defining constraint (see `CLAUDE.md` §2), restated here because it's also a reliability
  guarantee: a judge ruling on partial information isn't a verification failure the system would
  even notice unless this is checked directly.
