---
name: pref-project-docs-structure
description: User wants many small focused docs for this project, not one monolithic knowledge file
metadata:
  type: feedback
---

For agnet-project, the user explicitly rejected a single combined "knowledge" markdown file and
wants separate, focused documents instead: an architecture doc, a summary doc, an ideas/backlog
doc, and one rules/responsibilities doc per specialized agent (backend, frontend, testing,
devops). `CLAUDE.md` at the repo root is the single top-level entry point (project idea + global
rules + a map to the other docs) — deeper docs live under `docs/` and `.claude/`.

**Why:** Each future specialized agent (frontend/backend/testing/devops) should read a small
targeted file relevant to its job rather than one large document mixing everything.

**How to apply:** Default to multiple small files under `docs/` (see `CLAUDE.md` §5
"Documentation Map" for the planned file list), not one big file. Update `CLAUDE.md` itself only
for high-level project idea/rules/roadmap. Related: [[memory-location]],
[[module-processing-workflow]].
