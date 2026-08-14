---
name: memory-location
description: All durable memory/notes for this project must live inside this repo, not in Claude Code's global per-machine memory store
metadata:
  type: feedback
---

For agnet-project, all durable facts, preferences, and decisions must be written **inside this
repo only** — under `.claude/memory/` (this folder) for assistant-facing working notes, or into
`CLAUDE.md` / `docs/` for project content. Nothing should be written to Claude Code's global
per-machine memory store (`~/.claude/projects/<project-id>/memory/`).

**Why:** the user wants this project fully self-contained and portable — visible to anyone who
clones the repo (including a grader), not dependent on this specific machine's local Claude Code
config. A 2026-08-12 session had written project facts to the global memory store before this
rule was given; those were migrated into this folder and the global copies deleted.

**How to apply:** at the start of any session on this repo, read `.claude/memory/MEMORY.md` (the
index) instead of relying on global memory recall. When something durable comes up mid-session,
write/update a file here (same frontmatter format as Claude Code's global memory: `name`,
`description`, `metadata.type` of `user`/`feedback`/`project`/`reference`, body with **Why:**/
**How to apply:** for feedback/project entries) and add a one-line pointer to `MEMORY.md`. Do not
create a global memory entry for this project, including this rule itself — `CLAUDE.md` already
gets auto-loaded each session, so a short pointer there (§8) is what makes this self-enforcing
without needing the global store at all.
