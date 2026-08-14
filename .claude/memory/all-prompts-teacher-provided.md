---
name: all-prompts-teacher-provided
description: Correction - all 7 agent system prompts (4 advocates + 3 judges) come from the teacher, not just the judges'
metadata:
  type: project
---

Corrected 2026-08-14 by the user: **all 7 system prompts** for agnet-project's pipeline — the 4
advocate prompts (2 defense, 2 prosecution) AND the 3 judge prompts — are supplied by the teacher
before a run. Earlier in the project this was assumed to be split (we author the 4 advocate
prompts ourselves, teacher only supplies the 3 judge prompts) — that assumption was wrong and has
been corrected throughout the repo.

**Why:** Changes our actual scope of work: we do not author *any* agent's persuasive content or
strategy — our job is purely the orchestration/backend/frontend/database/verification that runs
the 7 teacher-provided prompts correctly, never the prompts themselves. This also sharpens Module
1's grading claim ("I grade how well you direct the agent, not the app you ship") since there's
now zero prompt-writing in scope — 100% of our graded work is directing/building/verifying.

**How to apply:** Never draft, edit, or suggest wording for any of the 7 system prompts in
agnet-project — treat them as opaque input received from the teacher, stored verbatim, versioned
but never modified (see `docs/rules/agent-design.md` and `docs/rules/security-and-permissions.md`
in the repo). The input to a run is the court problem/case (what happened); the output is the 3
judges' verdicts — see `CLAUDE.md` §2, which is the canonical project overview (this file only
tracks the correction itself, not a duplicate project summary).
