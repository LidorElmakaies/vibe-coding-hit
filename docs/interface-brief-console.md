# Interface Brief — The Console (single page)

> Supersedes `docs/interface-brief-opinion-screen.md` and `docs/interface-brief-admin-console.md`
> (both kept on disk, marked superseded, not deleted — see those files). Produced 2026-08-17 after
> the user corrected the UI shape directly: **the entire browser UI is one page**, not a
> submission form + results screen + past-cases list + separate admin console. See
> [ADR-0015](decisions/0015-single-page-console-ui.md) for why.

## Scope

Everything the user does happens on one page, called **the Console**:

1. **Case input** — the charge sheet text (defendant, act, exact question).
2. **Per-agent config** (×7: 2 defense, 2 prosecution, 3 judges) — system prompt (seeded with the
   teacher's default text, editable), model, output-token limit.
3. **One Run button.**
4. **Live per-agent output** while the pipeline executes — each of the 7 agents visibly "thinking"
   as it streams.
5. **Results** — the 3 verdicts (together, first) + the 4 advocate arguments, same information
   hierarchy as the original opinion-screen brief.
6. **Run summary** — total cost, total tokens, total time, once the run completes.
7. **Past runs** — a lightweight history panel on this same page (not a separate screen), so a
   past run can still be found and re-read later, per `docs/framing.md` §2/§4's reason the
   past-cases capability exists at all. Kept minimal: a list the user can open, not a second page.

## 1. User Flow

- **Land on the Console** → 7 config panels pre-filled with current defaults (teacher's prompt
  text, a default model, a default token limit) + an empty case-input field + a Run button
  (disabled until the case field is non-empty).
- **Edit anything** (case text, any agent's prompt/model/limit) → local edits; Run always uses
  whatever is currently in the fields at the moment it's pressed.
- **Press Run** → validates the case field is non-empty (reject with a clear reason otherwise, no
  partial run starts) → the 7 calls execute per the two-stage pipeline (`docs/architecture.md`
  §2) → each panel streams its own output live → verdicts appear once all 3 judges finish → the
  run summary (cost/tokens/time) appears.
- **Wrong paths that must be named, not left for the agent to guess:**
  - Empty case text → Run stays disabled or rejects with a visible reason; no call is made.
  - A prompt field emptied for one agent → that agent's slot can't run; surface this before
    calling OpenRouter, not as a confusing mid-run failure.
  - A call fails mid-run → that specific agent's panel shows a distinct, visible failure state —
    never blank, never styled like a real output. The rest of the run continues; one failed
    advocate doesn't block the others, one failed judge doesn't hide the other two verdicts.
  - Run pressed again while a run is in progress → disable Run until the current one finishes, or
    make unmistakably clear which output belongs to which run — never let two runs' streamed
    output interleave silently in the same panels.

## 2. Information Hierarchy

**Revised 2026-08-18** — the original "verdicts first" ordering (below the strikethrough) was
inherited from the old read-only opinion-screen brief and doesn't fit a page you configure and run
top-to-bottom. User corrected it directly: top-to-bottom reading order should follow the actual
workflow, not results-first.

1. **Case input**, at the top — the thing you fill in first.
2. **The 7 agent config panels** (grouped by role) — configure before you run.
3. **The Run control.**
4. **Results** — the 3 verdicts together + reasons + run summary (cost/tokens/time) — this is "the
   end" of the main flow, appearing once a run has actually happened, not before.
5. **Past-runs history**, last — below everything else, browsed separately from the main flow.

~~1. The 3 verdicts, together — first, once available, not buried under the live-output panels
that preceded them.~~
~~2. Reasons under each verdict.~~
~~3. The 7 live/finished agent panels — the visible mechanism of the run.~~
~~4. Run summary — near the verdicts.~~
~~5. Case input + past-runs history — lowest priority.~~

## 2a. Model Selection (added 2026-08-18)

Two modes, not per-agent free text:
- **Single model for all** — one dropdown, applies the same model to all 7 agents.
- **Random per agent** — each of the 7 agents gets an independently random model from the curated
  list (see `lib/constants.ts`'s `CURATED_MODELS`), re-rolled on each Run.

Both render as an actual `<select>` dropdown populated from the curated model list (`GET
/api/models`), not a free-text field — the original "no model list decided" open item is resolved
by this curated set, not by exposing OpenRouter's full catalog (hundreds of models) in one
dropdown.

## 2b. Visual Design (added 2026-08-18)

User feedback: the page reads as low-contrast grayscale and is hard to read. This brief
deliberately never specified colors/pixels (Module 8's "right altitude") — that's still true, but
"functionally distinct states, actually readable text" is now explicit, not assumed:
- Real text/background contrast — not near-white-on-white or near-black-on-black.
- Panel states (idle/running/failed/done/blocked) should be distinguishable by actual hue, not
  only shades of gray — this was already required functionally (§4 "Feedback Design"), now called
  out as a visual requirement too, since gray-on-gray technically satisfies "a different CSS class"
  while still failing "looks different at a glance."

## 3. Interaction Model

Both configuration AND execution live on this one page — unlike the original opinion-screen brief
(deliberately read-only once submitted), this page is editable by design before every run.
Keep the editable surface to what's named here (case text; per-agent prompt/model/token-limit);
resist adding controls this brief doesn't name.

## 4. Feedback Design

- **Idle:** config panels show current values, case field empty/prompting for input, Run
  disabled or clearly available depending on case-field state.
- **Running:** each of the 7 panels shows its own live-streaming state independently (advocates
  first, then judges once all 4 advocate outputs exist) — not one whole-page spinner.
- **Failed:** distinct per-panel failure state, unmistakable, never blank.
- **Done:** verdicts + summary visible; panels stay inspectable (not cleared).

## Open Items For Whoever Builds This

- Exact visual treatment (colors, layout, panel arrangement) intentionally not specified — per
  Module 8, right altitude means *what's shown and in what order*, not pixels.
- Whether every Run persists a `case` row (so it's always in the history panel) or only on
  success — not yet decided; a reasonable default is "persist regardless, mark failed runs as
  failed in the history too," but flag rather than assume if it matters later.
