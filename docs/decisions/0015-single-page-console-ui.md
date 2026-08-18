# ADR-0015: Single-Page Console UI (Supersedes the 3-Screen + Admin-Console Split)

**Status:** Accepted (2026-08-17)
**Modules:** 8 (interface design — right altitude, don't over-specify)

## Context

Following [ADR-0014](0014-editable-agent-config-admin-console.md), I (the assistant) proposed the
new editable-config surface as a 4th screen ("Admin/Run Console"), additive to the original
3-screen design (submission form, results screen, past-cases list) from `docs/framing.md`/
`docs/interface-brief-opinion-screen.md`. The user confirmed that framing when asked directly.

One exchange later, when asked a follow-up question that assumed the 4-screen/admin-vs-public
split, the user corrected it plainly: *"i dont have an admin and a users in my project just a
single page you configure the case and system prompts and the limit for the output and click run
and see the agents running the results of each and how much everything took in tokens time."*
There is no admin/public audience distinction in this project at all — one page, one audience,
everything on it.

## Options Considered

**A. Keep the 4-screen split (status quo from ADR-0014).** Already specced and partly reflected
in teammates' in-progress work, but directly contradicts what the user just said plainly. Not a
real option once corrected.

**B. Single page. (Chosen)** Case input, all 7 agents' config (prompt/model/token-limit), one Run
button, live per-agent streamed output, results (verdicts + arguments), and a cost/tokens/time
summary — all in one view, for the one audience this project actually has.

## Decision

Collapse the submission form, results screen, past-cases list, and Admin/Run Console into **one
page**, documented in `docs/interface-brief-console.md` (supersedes both
`docs/interface-brief-opinion-screen.md` and `docs/interface-brief-admin-console.md`, which are
kept on disk marked superseded, not deleted — their still-relevant content, like the required
failure/deliberating states, carries forward). "Past cases" survives as a lightweight history
panel on the same page, not a separate screen.

## Why It's Better Than the Alternative

- It's what was actually asked for — a 4-screen admin/public split was my own inference from
  ADR-0014's reversal, not something the user asked for; once corrected, building toward it further
  would be solving a problem that doesn't exist in this project.
- Matches Module 8's own "right altitude" guidance and this project's repeated "keep it minimal"
  instruction (`CLAUDE.md` §2) — one page for one audience is simpler than a role-gated split that
  was never needed.

## Consequences

- **Backend/DB is largely unaffected.** `agent_config`, `call_log` snapshotting, the streaming
  endpoint, and the two-stage pipeline (ADR-0014, `docs/architecture.md` §3/§5) are still needed —
  this ADR changes the *page structure* consuming them, not the API/DB shape.
- **Every Run is (by default) a real, persisted case**, shown in the same page's history panel —
  there's no longer a separate "config-testing, not a real case" path to design for, since there's
  no separate admin audience for that distinction to serve. Resolves the open item both
  `docs/interface-brief-opinion-screen.md`'s and `docs/interface-brief-admin-console.md`'s
  "Open Items" sections raised.
- **Teammates already told about the 4-screen split needed a direct correction** — sent via
  SendMessage the same day, referencing this ADR and `docs/interface-brief-console.md` instead of
  the two superseded briefs.
- **`CLAUDE.md` §5's documentation map and `docs/architecture.md` §1/§5 need updating** to point at
  the single console brief, not the two superseded ones — done alongside this ADR.
