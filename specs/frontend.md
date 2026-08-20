# Frontend — The Console

The entire UI is one page: `app/page.tsx` (client component, `"use client"`), composing components
from `components/console/`. No routing beyond `/` — there is no separate results page, admin page,
or past-cases page (superseded design, see [ADR-0015](../docs/decisions/0015-single-page-console-ui.md)).
Shared types in `components/console/types.ts`; all `fetch` calls isolated in `components/console/api.ts`;
styling via one CSS Module, `components/console/console.module.css`.

## Component list and responsibilities

| Component | File | Responsibility |
|---|---|---|
| `ConsolePage` | `app/page.tsx` | Owns all state: `caseText`, `configs` (per-role `AgentConfigDTO \| null`), `runStates` (per-role `AgentRunState`), `saveStates`, `running`/`hasRunStarted`, `summary`, `pastRuns`, model-selection state. Orchestrates every fetch, the SSE consumption loop, and derives `blockReason`/`canRun`. |
| `CaseInputSection` | `CaseInputSection.tsx` | The charge-sheet `<textarea>` — one free-text field, no structured defendant/act/question split. |
| `AgentPanelGroup` | `AgentPanelGroup.tsx` | Renders one heading ("Defense"/"Prosecution"/"Judges") + a grid of `AgentPanel`s for the roles it's given. Purely presentational grouping — used 3× in `ConsolePage`. |
| `AgentPanel` | `AgentPanel.tsx` | One agent's full editable config (system prompt textarea, max-tokens input, model readout — read-only text, not editable here), its Save button + save-state indicator, and its live/final output box. |
| `ModelSelector` | `ModelSelector.tsx` | The "Single model for all" / "Random per agent" toggle; in single mode, a `<select>` that applies immediately on change; in random mode, an explanatory note only (no dropdown — the pick happens at Run time). |
| `RunControl` | `RunControl.tsx` | The Run button + a visible block-reason string when disabled. |
| `VerdictsSummary` | `VerdictsSummary.tsx` | The 3 judge verdict cards, rendered together. Each card's state (pending/running/done-parsed/done-unparsed/failed) is independent of the others. |
| `RunSummaryBox` | `RunSummaryBox.tsx` | Total cost/tokens/time — only rendered once a real `summary` object exists (or a "will appear once finished" placeholder while running); never a fabricated/estimated number. |
| `PastRunsPanel` | `PastRunsPanel.tsx` | The history list (from `GET /api/cases`) — each row opens `handleOpenPastRun`, which loads `GET /api/cases/:id` and switches the whole page into read-only viewing mode. |

## Page layout / information hierarchy (current, post-reorder)

Per `docs/interface-brief-console.md` §2 (revised 2026-08-18) and matching the real JSX order in
`app/page.tsx`:

1. **Header** — title + one-line description; a "viewing past run" banner (with a "Start a new
   run" link) when `viewingPastRun` is set; a run-error banner when `runError` is set.
2. **Charge sheet** (`CaseInputSection`) — filled in first.
3. **Agents** section — the 7 config panels, grouped Defense / Prosecution / Judges
   (`AgentPanelGroup` × 3).
4. **Model selection** (`ModelSelector`).
5. **Run control** (`RunControl`).
6. **Verdicts** (`VerdictsSummary`) — "the end" of the main flow; renders an empty-state message
   until `hasRunStarted` is true.
7. **Run summary** (`RunSummaryBox`).
8. **Past runs** (`PastRunsPanel`) — last, browsed separately from the configure→run flow.

This intentionally supersedes an earlier "verdicts first" ordering (visible, struck through, in
`docs/interface-brief-console.md` §2) — the real code follows the configure-then-run top-to-bottom
order, not a results-first one.

## Panel state machine

`PanelStatus` (`components/console/types.ts`), one value per agent role at any time, driving
`AgentPanel`'s status badge and output box:

```
loading-config → (config loads) → idle
loading-config → (config fetch fails) → config-unavailable
idle → (Run pressed, this judge's prompt was empty at that moment) → blocked-empty-prompt
idle → (Run pressed, agent-status event) → running
running → (agent-delta events) → running (streamedText accumulates)
running → (agent-done event) → done
running → (agent-failed event, or a run-failed event / thrown request error) → failed
```

- `config-unavailable`: the initial `GET /api/agent-config` fetch failed — no config is guessed in
  its place; editing and running stay disabled for that role.
- `blocked-empty-prompt`: only ever assigned to a **judge** role, computed client-side right before
  a run starts (`JUDGE_ROLES.filter(r => !configs[r].systemPrompt.trim())`) — an advocate with an
  empty prompt instead **blocks the Run button entirely** (`blockReason` in `app/page.tsx`
  requires all 4 advocate prompts non-empty, since judges need the full 4-slot bundle), so
  `blocked-empty-prompt` in practice is judges-only.
  A blocked judge's role is excluded from the `POST /api/run` request's `agents[]` array entirely.
- `markUnfinishedAsFailed()` (`app/page.tsx`): on a `run-failed` SSE event or a thrown request
  error, every role still `running` or `idle` is force-flipped to `failed` — guarantees no panel is
  ever left looking "still in progress" after the run is known to be over.
- Opening a past run (`handleOpenPastRun`) sets every role directly to `done` (with `judgeResult` if
  present) or `failed` (`"This call failed during the original run."`) from the stored
  `advocate_outputs`/`verdicts` rows — never re-enters `loading-config`/`idle`.

`SaveState` (`{ state: "idle" | "saving" | "saved" | "failed"; message?: string }`) is a separate,
per-role state tracking only the Save-button/edit lifecycle, independent of `PanelStatus`. A
`localTouched` flag inside `AgentPanel` shows "Unsaved changes" whenever the field differs from the
last save, regardless of `saveState`.

## Verdict card states (`VerdictsSummary`)

Distinct from `PanelStatus` — computed per judge role from the same `runStates`:
1. `!hasRunStarted` → one empty-state message for the whole section.
2. `status === "failed"` → red "Verdict unavailable — call failed" card.
3. `status === "done" && judgeResult` → the parsed verdict + reasons list (green).
4. `status === "done"` **without** `judgeResult` → amber "No structured verdict parsed" card — the
   call succeeded, but `parseJudgeOutput` returned `null`; this is a real, distinct state, never
   conflated with either a parsed verdict or a failure.
5. `status === "running"` → "Deliberating…".
6. otherwise (idle/blocked/loading) → "Waiting for the 4 advocates to finish."

## Visual design system (introduced in the 2026-08-18 contrast fix)

Defined as CSS custom properties on `.page` in `console.module.css`, in response to explicit
feedback that the page read as low-contrast grayscale (`docs/interface-brief-console.md` §2b).
Deliberately hue-differentiated, not shades-of-gray, so panel states are distinguishable at a
glance, not only by (possibly hard-to-scan) text label:

| Token | Value | Used for |
|---|---|---|
| `--ink` | `#16181d` | Primary text |
| `--ink-muted` | `#4b5160` | Secondary text |
| `--paper` | `#ffffff` | Panel/card surfaces |
| `--canvas` | `#eef1f6` | Page background (distinct from panel surfaces) |
| `--border` | `#c7ccd6` | Default borders |
| `--blue` / `--blue-bg` / `--blue-ink` | `#1d4fd8` / `#dde7ff` / `#123a9c` | Running state, primary action (Run button, model-mode toggle), links |
| `--green` / `--green-bg` / `--green-ink` | `#157a45` / `#d9f2e3` / `#0e5c33` | Done / success / complete / parsed verdict |
| `--red` / `--red-bg` / `--red-ink` | `#c22b1f` / `#fbdedb` / `#8f1f16` | Failed / config-unavailable / blocked-run reasons |
| `--amber` / `--amber-bg` / `--amber-ink` | `#a15c00` / `#ffe8b8` / `#7a4600` | Blocked-empty-prompt / partial-failure / unparsed-verdict |
| `--slate` / `--slate-bg` | `#414958` / `#e3e6ec` | Idle / pending / neutral badges, section titles |

Each `PanelStatus` and `PastRunSummary.status` value maps to one of these hue families via a fixed
`STATUS_CLASS`/`STATUS_LABEL` lookup table in the relevant component (`AgentPanel.tsx`,
`PastRunsPanel.tsx`) — not computed inline, so the mapping is exhaustive and typo-proof against the
TypeScript union. The running badge additionally pulses (`@keyframes pulse`, opacity 1↔0.5) as a
non-color cue.

## Frontend/backend contract notes worth knowing

- `components/console/types.ts` and `lib/constants.ts` each independently define `AgentRole`/
  `ADVOCATE_ROLES`/`JUDGE_ROLES`/`ALL_ROLES` — this project has no shared package between `app/`
  and `components/`, so these two copies must be kept in sync by hand (noted explicitly in both
  files' header comments).
- `components/console/api.ts`'s `RunEvent` type is likewise a hand-maintained duplicate of
  `lib/orchestrator/events.ts`'s `RunEvent` — see [`api.md`](api.md) for the shared shape.
- The Console never hardcodes the curated model list or any prompt text — both are always fetched
  (`GET /api/models`, `GET /api/agent-config`) and a fetch failure produces a genuine
  unavailable/error UI state, never a silently-substituted default.
