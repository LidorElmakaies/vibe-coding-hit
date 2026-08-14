# Rules — Audit Trail & Reliability

> Part of the split-out rule set — see [`CLAUDE.md`](../../CLAUDE.md) §2 for the pointer.

- **Every pipeline run needs an audit trail.** Each run (4 advocate calls + 3 judge calls) must
  produce a frozen record linking intent → specification/system-prompt used → context handed in →
  actual output → verification applied. Not satisfied by "it printed to the console." Concretely,
  persist per call: **model, output, token counts, cost, time** — plus the case and the resulting
  output, so a past run can be found and re-read later via the past-cases list. Persistence
  mechanism TBD once the backend stack is chosen. *(Modules 4, 7)*

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
