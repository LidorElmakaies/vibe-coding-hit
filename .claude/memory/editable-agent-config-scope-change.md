---
name: editable-agent-config-scope-change
description: Scope change (2026-08-17) - agent model/prompt/token-limit are now editable per agent via a new frontend Admin/Run Console, reversing the earlier backend-only prompt rule
metadata:
  type: project
---

On 2026-08-17, mid-build (while the `backend`/`frontend` agent-team teammates were already
scaffolding the app — see [[agent-teams-feature-plan]]), the user added requirements that directly
reversed a rule the project had treated as non-negotiable since 2026-08-14: that all 7 system
prompts are backend-only, verbatim, never edited by anyone. The user explicitly wants: a model
picker and an output-token-limit control per agent, and **the system prompt itself editable in the
frontend** — with the teacher-provided text as the seeded default, not the permanent fixed value.
Also wants: live streaming of each model's output while it runs, and one "Run" button producing a
summary box of cost/tokens/decisions. This was flagged back to the user as a direct rule conflict
before building anything (see [[all-prompts-teacher-provided]]) rather than silently implemented —
the user confirmed the reversal is intentional.

**Why:** The user's own call — recorded here so a future session (or a teammate agent) doesn't
"fix" the editable-prompt feature back to backend-only, thinking it's a bug against the original
rule. It's a deliberate, dated decision, not drift.

**Correction (2026-08-17, same day):** the "4th page, additive" framing below was my own wrong
inference — the user corrected it immediately after: there is no admin/public split in this
project, it's **one single page** for everyone. See [[single-page-console-ui]] for that
correction; `docs/interface-brief-console.md` + [ADR-0015](../../docs/decisions/0015-single-page-console-ui.md)
are now the source of truth for UI shape, not the "4th page" language below.

**How to apply:** The full reasoning, options considered, and consequences are in
[ADR-0014](../../docs/decisions/0014-editable-agent-config-admin-console.md) — read that before
touching prompt-handling code (still accurate for the editable-config mechanism itself). Key
points to hold onto:
- ~~New Admin/Run Console is a 4th page, additive to the existing submission/results/past-cases
  screens~~ — **superseded, see the correction above.** Everything (case input, all 7 agents'
  config, Run, results, summary, past-runs history) lives on one page now.
- Prompt text now travels to the browser and is stored in a new `agent_config` table — no longer
  a secret the way the OpenRouter key is (which stays backend-only, unaffected by this reversal).
- `call_log` rows must snapshot the actual prompt/model/max-tokens used per call (not just
  reference the live, now-mutable `agent_config` row) — see
  `docs/rules/audit-and-reliability.md`.
- We (the builders) still never author new prompt content ourselves — only the console's user
  edits the loaded default, and the teacher's verbatim text is still what ships as that default,
  once actually provided (still not received as of this writing — see `CLAUDE.md` §6).
- Docs updated same day: `CLAUDE.md` §2/§5/§6, `docs/rules/security-and-permissions.md`,
  `docs/rules/audit-and-reliability.md`, `docs/architecture.md` §3-6, `docs/cost-budget.md` §2,
  `docs/decisions/README.md`, `docs/decisions-log.md`. Related:
  [[all-prompts-teacher-provided]], [[agent-teams-feature-plan]].
