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

**Why:** The class project is meant to demonstrate multi-agent orchestration skill; using Claude
Code's own agent-teams feature to build the courtroom sim (frontend/backend/testing/devops agents
working together) is itself part of the learning exercise, so it should be documented like any
other project convention.

**How to apply:** Before spinning up frontend/backend/testing/devops sub-agents for agnet-project,
fetch the agent-teams docs, write `.claude/agent-teams.md`, and create the activation skill. Empty
`.claude/agents/` and `.claude/skills/` folders already exist as scaffolding. Related:
`CLAUDE.md` §2/§5, [[pref-project-docs-structure]].
