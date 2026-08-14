# ADR-0003: Keep All Assistant Memory Inside the Repo

**Status:** Accepted (2026-08-12)
**Modules:** 11 (context engineering — Claude Code's own per-repo memory pattern matches this)

## Context

Claude Code (the AI assistant used to build this project) has a built-in persistent memory system
that, by default, stores facts about a project in a global, per-machine folder outside any repo
(`~/.claude/projects/<project-id>/memory/`). The question: use that default, or keep memory
somewhere else.

## Options Considered

**A. Use Claude Code's default global memory store.**
Zero setup, survives across unrelated projects on the same machine automatically. But it lives
outside this repo entirely — invisible to anyone who clones `vibe-coding-hit` from GitHub
(including a grader), and tied to one specific computer rather than the project itself.

**B. Keep all durable memory inside the repo, under `.claude/memory/`. (Chosen)**
Requires an explicit convention (see `CLAUDE.md` §8) instead of relying on the tool's default
behavior. In exchange, everything the assistant "remembers" about this project travels with the
project — clone the repo anywhere, get the same context.

## Decision

Option B. All project memory lives in `.claude/memory/` in this repo; nothing is written to the
global per-machine store.

## Why It's Better Than the Alternative

This project's whole point is to be *inspectable* — the teacher grades what's visible in the repo,
not verbal claims (per [Module 1](../modules/module1-what-is-agentic-software-engineering.md)'s
grading rule). Memory that lives outside the repo is memory the teacher can never see, which
directly undercuts the project's own grading premise. The portability cost (one convention to
maintain) is small next to that.

**Coincidentally validated by [Module 11](../modules/module11-context-engineering.md)**, taught
two days later: it describes Claude Code's own recommended pattern as "auto memory per repository
in a memory folder" — i.e. the module independently teaches the repo-scoped pattern we'd already
adopted, not the global default.

## Consequences

- One extra rule to maintain (`CLAUDE.md` §8) reminding the assistant not to fall back to the
  global store.
- All 5 memory files that had already been written to the global store (before this ADR was
  formalized) were migrated into the repo and deleted from the global location — see
  `docs/decisions-log.md`, 2026-08-12 entry.
