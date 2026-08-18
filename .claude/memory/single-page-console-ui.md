---
name: single-page-console-ui
description: The entire agnet-project UI is one single page ("the Console") - no admin/public split, ever proposed that and was corrected
metadata:
  type: project
---

There is **no admin/user split** in agnet-project. The entire browser UI is **one single page**
("the Console"): case-text input, all 7 agents' config (system prompt seeded from the teacher's
default, model, output-token limit), one Run button, live per-agent streamed output while each
agent runs, results (3 verdicts + 4 advocate arguments), a cost/tokens/time run summary, and a
lightweight past-runs history panel — all on that one page, for the one audience this project has.

I (the assistant) proposed a 4-screen split instead — submission form / results screen /
past-cases list / a separate "Admin/Run Console" — as my own inference when adding the
editable-agent-config feature (see [[editable-agent-config-scope-change]]). The user corrected
this directly and plainly on 2026-08-17, one exchange after seemingly confirming the 4-screen
framing (they'd picked "alongside the 3 screens" when asked, but that answer didn't actually
register the admin/public distinction being proposed — the real correction came from their own
description of the page, not from re-answering the same question).

**Why this matters going forward:** don't reintroduce a multi-screen or admin/public split for
this project even if it seems like a clean way to organize a growing feature set — the user has
said directly, twice in different words, that they want one page. If the page genuinely needs to
grow, split it into **components on the same page**, not separate screens/routes.

**How to apply:** `docs/interface-brief-console.md` is the canonical interface brief (supersedes
`docs/interface-brief-opinion-screen.md` and `docs/interface-brief-admin-console.md`, both kept on
disk marked superseded for their still-relevant content, not deleted). See
[ADR-0015](../../docs/decisions/0015-single-page-console-ui.md) for the full record. Related:
[[editable-agent-config-scope-change]].
