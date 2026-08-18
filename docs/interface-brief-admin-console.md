# Interface Brief — The Admin/Run Console

> **Superseded 2026-08-17, one day after being written, by [`docs/interface-brief-console.md`](interface-brief-console.md)**
> — the user clarified there is no separate admin/public split in this project: one single page
> does case input, agent config, running, live output, results, and cost/tokens/time, for
> everyone. See [ADR-0015](decisions/0015-single-page-console-ui.md). Kept on disk for its
> still-relevant content (per-agent panel design, streaming/save states), which the console brief
> carries forward — not deleted, per this repo's convention.

> Produced per [Module 8](modules/module8-interface-design-and-documentation.md)'s brief format,
> for the 4th screen added by [ADR-0014](decisions/0014-editable-agent-config-admin-console.md)
> (2026-08-17). Pencil draft, like `docs/interface-brief-opinion-screen.md` — revise as building
> teaches us more.

## Scope

A screen for configuring and running the 7-agent pipeline directly — separate from the public
case-submission flow (`docs/interface-brief-opinion-screen.md` covers that one). Not in scope
here: the submission form, the normal results screen, or the past-cases list — those are
unchanged by this brief.

## 1. User Flow

- **Land on the console** → see 7 agent config panels (2 defense, 2 prosecution, 3 judges), each
  pre-filled with its current `agent_config` row: model, system prompt (teacher's default unless
  previously edited), max output tokens.
- **Edit any field on any panel** → the edit is local until saved; saving persists it to
  `agent_config` so it becomes the new default for future runs, not just this one page load.
- **Press Run** → the pipeline executes exactly like a normal deliberation (advocates in parallel,
  then judges in parallel once all 4 advocate outputs exist — `docs/architecture.md` §2), except
  reading live `agent_config` values instead of static prompt files, and streaming each call's
  output to its panel as it generates.
- **Wrong paths that must be named, not left for the agent to guess:**
  - A prompt field is emptied entirely → Run must be disabled (or clearly rejected) for that
    agent's slot; an empty system prompt is not a valid "teacher's prompt, edited," it's a broken
    config.
  - A saved edit fails to persist (network/DB error) → the field shows a visible save-failure
    state; the console must never silently keep an edit only in local UI state while implying it
    was saved.
  - A call fails mid-run (same as the results screen) → that agent's panel shows a visible failure
    state, not a blank or a frozen "still thinking" indicator.
  - Someone presses Run again while a previous run is still in progress → either disable Run until
    the current run completes, or make clear multiple runs are now in flight and which panel
    belongs to which — don't let two runs' streamed output silently interleave in the same panels.

## 2. Information Hierarchy

1. **The 7 config panels**, grouped by role (defense / prosecution / judges) so the pipeline's
   shape is visible at a glance — not one flat list of 7 identical-looking boxes.
2. **The Run button** — one, clearly the primary action of the page, not competing visually with
   the per-panel save controls.
3. **Live per-agent output**, inline in each panel once a run starts — this is what makes "show
   each model live while it's thinking" real; a panel's streamed text should appear where that
   agent's config already is, not in a separate area the user has to correlate back.
4. **The run summary** (total cost, total tokens, the 3 judges' decisions together) — surfaces
   once the run completes, positioned so it reads as the payoff of pressing Run, not buried below
   the 7 panels where it could be missed.

## 3. Interaction Model

Unlike the results screen (deliberately read-only, per its own brief), this screen is **editable
by design** — that's its entire purpose. Still keep it narrow: editing is limited to the three
fields ADR-0014 names (model, prompt, max tokens) per agent, plus Run. Resist adding controls this
brief doesn't name (per-agent temperature, retry count, etc.) unless a real need for one turns up.

## 4. Feedback Design

- **Idle (before Run):** panels show their current saved config, clearly distinguishable from
  "streaming" or "failed" states — a panel that hasn't run yet must not look like one that's
  waiting on a slow call.
- **Streaming ("thinking"):** each of the 7 panels shows its own live-updating output independent
  of the others, reflecting the same staged progress as the results screen (advocates first, then
  judges once all 4 advocate outputs exist) — not one spinner for the whole page.
- **Failed:** a distinct, unmistakable failure state per panel — same standard as
  `docs/interface-brief-opinion-screen.md` §4: never blank, never styled like a normal result.
- **Save state:** editing a field and saving it needs its own small, clear confirmation — distinct
  from run-state feedback, since these are two different actions (configure vs. execute) that
  shouldn't be visually conflated.

## Open Items For Whoever Builds This

- Exact visual treatment (colors, layout, panel arrangement) intentionally not specified — per
  Module 8, right altitude means *what's shown and in what order*, not pixels.
- Whether "Run" on this console should create a normal `case` row (so it's browsable later via the
  past-cases list) or is treated as a distinct config-testing run outside that flow — not yet
  decided; flag to the lead/user rather than guessing either way.
