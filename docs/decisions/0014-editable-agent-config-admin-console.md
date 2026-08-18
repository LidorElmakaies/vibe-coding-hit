# ADR-0014: Editable Agent Config (Prompt/Model/Token-Limit) via an Admin Console

**Status:** Accepted (2026-08-17)
**Modules:** 7 (trust boundary), 9 (match capability to difficulty, economic blast radius)

## Context

The project's rules, from the first commit, treated all 7 system prompts as immutable and
backend-only: teacher-provided, stored verbatim, never sent to the browser, never edited by us
(see `CLAUDE.md` §2, `docs/rules/security-and-permissions.md`, `docs/architecture.md` §4). The
reasoning was that nothing of ours belongs on the prompt side to leak, so the browser/backend
trust boundary had nothing to protect there.

The user directly asked for a new capability that reverses part of this: a frontend surface where
each of the 7 agents' **model**, **output-token limit**, and **system prompt text** can be viewed
and edited before a run, with the teacher's provided text loaded as the **default** value for each
prompt. This is a deliberate scope change, not drift — recorded here so it's visible as a real
decision rather than a silent contradiction of the earlier rule.

## Options Considered

**A. Keep prompts fully backend-only (status quo).** Preserves the original trust boundary exactly,
but doesn't deliver what was asked — the user explicitly wants to see and change a prompt's text
before running it, seeded from the teacher's version.

**B. Make all agent config (including prompts) fully open and editable directly on the public
case-submission flow.** Simplest to build, but conflates two different audiences: someone
submitting a case for a real deliberation shouldn't need to also manage 7 agents' model/prompt/
token-limit settings just to submit a charge sheet.

**C. A separate Admin/Run Console page, alongside the existing 3 screens. (Chosen)** One
dedicated screen holds per-agent config (model, prompt — seeded with the teacher's default text,
output-token limit) for all 7 agents, plus a single "Run" button, live per-agent streaming output,
and a run summary (cost, total tokens, the judges' decisions). The existing submission form,
results screen, and past-cases list are unchanged — this is additive, not a replacement (confirmed
with the user directly).

## Decision

Build the Admin/Run Console as a 4th page. Agent config (role, model, system prompt, max output
tokens) is **persisted**, not just in-memory — a new `agent_config` table (one row per of the 7
agent roles), seeded with the teacher's verbatim text as the default `system_prompt` value once
that text is provided (placeholder markers until then, per the existing scaffolding decision).
Editing a row in the console changes what the *next* run uses; it does not rewrite history.

The OpenRouter API key is explicitly **not** part of this reversal — it stays backend-only,
environment-variable-injected, never client-visible, exactly as originally decided.

## Why It's Better Than the Alternatives

- Delivers what was actually asked (editable prompt/model/token-limit, teacher text as default)
  without either quietly breaking the original trust-boundary rule (Option A) or over-broadening it
  onto a screen where it doesn't belong (Option B).
- Keeps the two audiences separate: a person submitting a real case doesn't see or touch agent
  internals; a person tuning the agents doesn't have to submit a fake case to do it.
- The teacher's original text is never lost — it's the seeded default, so "reset to teacher's
  version" is just "don't have anything overridden," and the audit trail (see
  `docs/rules/audit-and-reliability.md`, updated alongside this ADR) freezes what was actually used
  per call regardless of later edits.

## Consequences

- **System prompt text is no longer a secret the way the OpenRouter key is** — it now travels to
  the browser, gets stored in an ordinary DB table, and is editable via a normal form. Updated
  `docs/rules/security-and-permissions.md` accordingly; that file draws the line explicitly (prompt
  text: reversed: key: unchanged).
- **The `agent_config` table is a new piece of persisted state** beyond the sketch in
  `docs/architecture.md` §3 (`case`, `advocate_output`, `verdict`, `call_log`) — add it there too.
- **Audit trail must snapshot, not reference.** Because config can change between runs, `call_log`
  rows need the actual prompt/model/token-limit values frozen onto them at call time, not a foreign
  key to a row that might later be edited — see the added rule in
  `docs/rules/audit-and-reliability.md`.
- **The economic blast-radius cap (`docs/cost-budget.md` §5) still applies** — an editable
  token-limit field is a UI convenience, not license to remove the hard ceiling reasoning behind
  1,300/700; the console should treat the existing numbers as sane defaults/upper guidance, not
  disappear them.
- **"We do not author the 7 prompts" still holds** — this ADR is about *who* can edit the loaded
  value (the console's user, deliberately, per-run) and *where* that value lives, not about us
  ever drafting persuasive content ourselves. That distinction is what CLAUDE.md §2 now states
  explicitly.
- **Live streaming and a run-summary box are new backend requirements** (SSE or equivalent
  per-call token streaming; a cost/tokens/decisions rollup) — not previously in
  `docs/architecture.md`, added there alongside this ADR.
