---
name: agent-teams-feature-plan
description: Planned - document Claude Code's agent-teams feature for agnet-project and build a skill to activate it during coding work
metadata:
  type: project
---

User wants to use Claude Code's "agent teams" capability (https://code.claude.com/docs/en/agent-teams)
for the agnet-project courtroom simulator once actual coding work starts (frontend/backend/testing/
devops sub-agents). Two deliverables requested, not yet built:
1. `.claude/agent-teams.md` — a doc summarizing how to use the agent-teams abilities in this repo.
2. A Claude Code skill (under `.claude/skills/`) that activates/engages agent-teams mode when
   working on the code itself.

These were explicitly deferred — user said to start with just `CLAUDE.md` (project idea + rules)
first, and build this once the project moves into actual implementation.

**Progress (2026-08-14):** the tech stack got decided (Next.js/TypeScript, ADRs 0009-0011) and all
four subagent definitions are now written — `.claude/agents/backend.md`, `frontend.md`,
`testing.md`, `devops.md` — each with a persona, job scope, and guidance pointing at the relevant
`docs/rules/*.md` and ADRs. Deployment pivoted same-day from Vercel to Docker Compose (local) +
Render (future production) — see ADR-0013 — and the devops agent owns that. Confirmed via the real
docs (fetched, not guessed) that these subagent definitions are directly reusable as agent-team
teammates too (`agent-teams` doc, "Use subagent definitions for teammates" section) — no separate
definition needed for team mode. Still not done: `.claude/agent-teams.md` and the activation skill.

**Why:** The class project is meant to demonstrate multi-agent orchestration skill; using Claude
Code's own agent-teams feature to build the courtroom sim (frontend/backend/testing/devops agents
working together) is itself part of the learning exercise, so it should be documented like any
other project convention.

**How to apply:** Write `.claude/agent-teams.md` and the activation skill next, referencing the
already-built subagent definitions rather than redefining roles. Also note: agent teams require
`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` to be set (experimental, disabled by default) — flag this
to the user before assuming the feature is usable as-is. Related: `CLAUDE.md` §2/§5,
[[pref-project-docs-structure]].
