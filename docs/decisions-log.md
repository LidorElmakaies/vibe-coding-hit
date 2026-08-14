# Decisions Log — agnet-project

> Chronological history of what changed and why, moved out of `CLAUDE.md` itself (Module 11:
> keep the auto-loaded root file short; history isn't a standing rule, so it doesn't need to load
> every session). Add an entry here whenever something in `CLAUDE.md`/`docs/` changes.

- 2026-08-12 — Project concept captured. Chose OpenRouter as LLM provider. Decided on a
  multi-file docs structure (`CLAUDE.md` + `docs/` + `.claude/`) instead of one monolithic doc.
  Set up `.claude/agents/`, `.claude/skills/`, `docs/modules/` scaffolding.
- 2026-08-12 — Modules 1–3 processed. Module 1 was framing only (no new rule). Modules 2 & 3 each
  added a concrete rule: human-written definition-of-done before delegating, tool/permission
  grants as the real boundary, anti-sycophancy by design for judge/testing agents.
- 2026-08-12 — Moved all durable assistant memory out of Claude Code's global per-machine store
  and into `.claude/memory/` in this repo — project must stay self-contained (see `CLAUDE.md` §8).
- 2026-08-12 — Modules 4 & 5 processed. Both added/sharpened rules: audit-trail requirement,
  intent-before-specification, no-agent-grades-its-own-work, "do less when uncertain" appended to
  the tool-boundary rule.
- 2026-08-12 — Modules 6 & 7 processed. Produced `docs/framing.md` (Module 6's required
  deliverable) and a first-draft `docs/architecture.md` (Module 7's four-part model applied to
  this project). Added the secrets-never-reach-the-browser rule, refined the audit-trail rule with
  concrete fields, added the keep-framing-current rule. Flagged an open question: Module 7's own
  worked example ("the Tribunal") looks like this exact project — unconfirmed.
- 2026-08-14 — User confirmed the Tribunal-identity question: this project *is* the course's
  Tribunal. Scope changed from "one fixed case run once" to a reusable web app (submission form +
  results view + past-cases list). Updated `docs/framing.md` and `docs/architecture.md`
  accordingly. Resolved three previously-open questions (Tribunal scope, frontend requirement,
  output format).
- 2026-08-14 — Modules 8 & 9 processed. Deck confirms outright that this project is the course's
  cognified-software example. Produced the two Module 8 deliverables (interface brief,
  documentation brief) and updated `docs/architecture.md` with parallel-execution shape, real
  cost/latency figures (~17k tokens, ~21s → ~6s), and prompt caching. **Split the growing Hard
  Rules list into `docs/rules/*.md` by topic** — `CLAUDE.md` §2 now separates project-defining
  Assignment Constraints from module-derived Engineering Discipline.
- 2026-08-14 — Modules 10 & 11 processed. Module 10 added the 5-part spec structure + Knuth's
  criteria + commit-points/drift-detection to `docs/rules/agent-design.md`. Module 11 is directly
  about this repo's own docs practice: added `docs/rules/context-and-docs-hygiene.md`; trimmed
  `CLAUDE.md` from 223 to ~171 lines (this changelog moved here, per-module descriptions in §4
  compressed to one line each) since the module itself sets a ~200-line guideline for the
  auto-loaded root file. Flagged an open question rather than quietly proceeding: most of this
  repo's docs have been assistant-drafted and bulk-approved, not hand-edited by the user — Module
  11's own finding says that measurably underperforms a genuinely human-written file.
- 2026-08-14 — Pushed the repo to GitHub (`github.com/LidorElmakaies/vibe-coding-hit`, public).
  Excluded `lessons/` via `.gitignore` (copyrighted lecture slides, repo is public); included
  `.claude/` (memory + `.gitkeep`-tracked scaffold folders) per the user's request.
- 2026-08-14 — **Correction: all 7 system prompts (4 advocates + 3 judges) are teacher-provided**,
  not just the judges' — earlier assumption that we'd author the 4 advocate prompts was wrong.
  Updated `CLAUDE.md` §2 (agent roles table, pipeline diagram, assignment constraints, input/output
  framing), `docs/framing.md`, `docs/architecture.md`, `docs/rules/agent-design.md`,
  `docs/rules/security-and-permissions.md`, and the Module 1/10 write-ups accordingly. Added
  `.claude/memory/all-prompts-teacher-provided.md`. Started `docs/decisions/` — an ADR-style
  planning record (options considered + rationale per major decision) so the reasoning behind each
  choice is visible, not just the conclusion.
- 2026-08-14 — New rule: the assistant never runs `git add`/`commit`/`push` on its own initiative —
  only drafts commit messages. Recorded in `.claude/memory/no-autonomous-git-commits.md` and
  `docs/rules/security-and-permissions.md`.
- 2026-08-14 — Stack decided: **Next.js (TypeScript, web only)**, **raw `openai` SDK against
  OpenRouter** (not LangChain), **Supabase (Postgres)**, **Vercel**. User's original React Native
  preference was flagged as a mismatch with the confirmed browser-based Tribunal architecture and
  resolved to Next.js instead; LangChain was weighed against the project's actual (very minimal)
  agent-calling needs and dropped in favor of the raw SDK. Recorded as ADRs 0009–0012. Updated
  `CLAUDE.md` §3/§6 and `docs/architecture.md` accordingly.
- 2026-08-14 — Wrote the three sub-agent definitions: `.claude/agents/backend.md`, `frontend.md`,
  `testing.md` — real Claude Code subagent files (persona + job + boundaries + git rule), verified
  against the actual `sub-agents`/`agent-teams` docs (fetched, not guessed) rather than assuming a
  format. Dropped the separately-planned `docs/agents/*.md` rules docs as duplicative now that
  these exist. Updated `CLAUDE.md` §5 and `.claude/memory/agent-teams-feature-plan.md` accordingly.
  Not yet built: a `devops` subagent, `.claude/agent-teams.md`, and the activation skill.
- 2026-08-14 — **Deployment changed: Docker Compose (local) + Render (future production), not
  Vercel.** User specified this directly. [ADR-0012](decisions/0012-vercel-deployment.md) marked
  superseded (kept, not deleted — the point of this folder is to show real direction happening,
  including a same-day course correction); [ADR-0013](decisions/0013-docker-compose-local-render-production.md)
  records the new decision: one Dockerfile for both local and (future) production, a plain
  Postgres container locally vs. hosted Supabase in production. Updated `CLAUDE.md` §3/§6 and
  `docs/architecture.md` accordingly. Added `.claude/agents/devops.md` — owns the Dockerfile,
  compose file, and env/secrets wiring; explicitly told not to pre-build Render config since
  that's future work, not current scope.
