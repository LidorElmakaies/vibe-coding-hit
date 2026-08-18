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

**Progress (2026-08-15):** User asked to actually activate agent teams and use them to build the
project. Set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `.claude/settings.local.json` (gitignored,
machine-local, not the shared repo — added the ignore rule to `.gitignore`). It did **not** take
effect in the live session — the Agent tool's schema still lacked the `name` param that agent-teams
mode adds, because Claude Code only watches `.claude/` for live settings changes if a settings file
already existed there when the session started. **Confirmed fix: reload/restart the Claude Code
session** (in the VS Code extension: reload window or start a fresh session in this folder) — user
chose "reload now, then spawn the real team" over falling back to ordinary subagents. User also
chose to scaffold the build with placeholders for the still-missing OpenRouter key and the 7
teacher prompts, rather than supply them first (see `CLAUDE.md` §6 open questions,
[[all-prompts-teacher-provided]]) — the actual prompt/key values are not in the repo, only the
concept is documented.

**How to apply next session:** once reloaded, verify `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is live
(the Agent tool should now accept a `name` param), then spawn four named teammates — backend,
frontend, testing, devops — reusing `.claude/agents/*.md` as their subagent-definition roles per
the docs' "Use subagent definitions for teammates" section. Kick off with a scaffold task: full
Next.js app per `docs/architecture.md`, Supabase schema, Docker Compose, with a `prompts/`
directory of placeholder teacher-prompt files and `.env.example` for `OPENROUTER_API_KEY` — nothing
wired to actually call OpenRouter for real until the user supplies both. Still not done after this:
`.claude/agent-teams.md` doc and the activation skill (original ask, still deferred).

**Important correction (2026-08-17) — peer-to-peer teammate messaging does NOT actually work in
this harness.** The `name` param on the Agent tool DID exist before the env var was ever set (it's
part of the standard Agent tool schema in this SDK-based/VS-Code-extension harness, not something
agent-teams mode specifically adds) — so its presence alone is not proof teams are truly active.
More importantly: two separate spawned teammates (`frontend`, `devops`) both explicitly reported
they have **no `SendMessage` tool** in their own toolset — they can only report back to the lead
when their turn ends, exactly like an ordinary background subagent. The lead (this session) *can*
message them (SendMessage to name works one-directionally, lead → teammate), but they cannot reach
each other or the lead proactively. **Treat this "team" as lead-hub-and-spoke, not true
peer-to-peer agent-teams** as the official docs describe for the full CLI product — the env var
and the fetched docs describe a feature that may not be fully implemented in this particular
harness. Don't assume teammates will coordinate among themselves; the lead must relay manually.
