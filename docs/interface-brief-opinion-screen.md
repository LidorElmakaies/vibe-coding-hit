# Interface Brief — The Opinion (Results) Screen

> Produced per [Module 8](modules/module8-interface-design-and-documentation.md)'s required
> deliverable: an interface brief for one screen, written to direct an agent, not to flatter a
> reader. Screen chosen: the one the module's own deck uses as its example — where the Tribunal's
> opinion is shown after a deliberation runs. Pencil draft, like `docs/framing.md` — revise as
> building teaches us more.

## Scope

The screen shown after a charge sheet has been submitted and all 7 calls (4 advocates + 3 judges)
have run (or are running). Not in scope here: the submission form itself, or the past-cases list
(separate screens, separate briefs if/when needed).

## 1. User Flow

- **Happy path:** submit charge sheet → screen shows a deliberating state → 4 advocate outputs
  appear (order: as each completes, since they run in parallel — see
  [`docs/architecture.md`](architecture.md)) → once all 4 exist, the 3 judges begin → 3 verdicts
  appear.
- **Wrong paths that must be named, not left for the agent to guess:**
  - Charge sheet submitted incomplete/invalid → rejected before any model call is made, with a
    clear reason shown; no partial deliberation starts.
  - A model call fails mid-run (malformed or erroring) → that specific slot (one advocate or one
    judge) shows a visible failure state, not a blank or a default verdict. Per
    [`docs/rules/audit-and-reliability.md`](rules/audit-and-reliability.md), a failure must never
    silently read as a real answer.
  - The panel is still deliberating → an explicit waiting/in-progress state per output slot, not a
    blank space that looks broken.
  - All 4 advocates succeeded but a judge fails → the other judges' verdicts still display; the
    failed judge's slot shows its own failure state independently (partial results are still
    real results, not an all-or-nothing screen).

## 2. Information Hierarchy

1. **The 3 verdicts, together, first** — not buried below the arguments, and not staggered so the
   reader has to piece together whether the judges agreed or split.
2. **Reasons** for each verdict, directly under it.
3. **The 4 full advocate arguments**, lower on the screen / behind a expand — available to read,
   not competing with the verdicts for first attention.
4. The original charge sheet, available but not prioritized (the reader already knows what they
   submitted).
5. **Total tokens used for the run** (added 2026-08-14, per `docs/cost-budget.md` §6) — a small,
   low-priority line, not competing with the verdicts. It exists for transparency (Module 9's
   "cost is architecture, not accounting"), not as a headline number — place it near the charge
   sheet, not near the verdicts.

## 3. Interaction Model

Minimal, per the module's own guidance ("the Tribunal needs only a form and a button"): once a
charge sheet is submitted, this screen is **read-only** — no editing, no re-running, no per-judge
controls. If the user wants a new deliberation, that's a new submission (a different screen). Do
not add controls (filters, sort, expand-all toggles, etc.) unless a real need for one turns up —
resist an agent defaulting to adding them because they "look like more capability."

## 4. Feedback Design

- **Deliberating:** each of the 7 output slots (4 advocate, 3 judge) shows its own
  waiting/in-progress indicator independently — since advocates run in parallel and judges start
  only after, the screen should visibly reflect that staged progress, not one single spinner for
  the whole screen.
- **Failed:** a failed slot shows a distinct, unmistakable failure state — never styled like a
  normal output, never blank.
- **Empty:** N/A for this screen (it only exists once a charge sheet was submitted) — but the
  charge-sheet-rejected case (§1) is this screen's version of "empty," and needs its own explicit
  state, not a silent redirect.
- **Slow:** if a call is taking unusually long, the in-progress state should still read as
  "working," not silently start to look identical to "failed" — the two must stay visually
  distinct even under a long wait.

## Open Items For Whoever Builds This

- Exact visual treatment (colors, layout) is intentionally not specified here — per Module 8,
  right altitude means specifying *what's shown and in what order*, not colors/pixels.
- Whether verdict disagreement (a 2-1 or 3-way split) needs any special visual callout beyond
  "show all 3 together" — not yet decided.
