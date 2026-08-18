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
- 2026-08-14 — Added [`docs/cost-budget.md`](cost-budget.md): a per-agent token budget (input
  budget + `max_tokens` output cap for advocates vs. judges), a total-per-run ceiling (≤25,100
  tokens, reconciled against Module 9's ~17k typical-case figure), an illustrative (not live)
  cost-per-run calculation method, and the resolved blast-radius cap (21 calls/run = 7 base × up
  to 3 attempts each). New project goal, added by the user directly: every run must calculate and
  persist total tokens used from OpenRouter's real `usage` data, not an estimate. Wired into
  `docs/framing.md` §3 (new item 7), `docs/rules/audit-and-reliability.md`,
  `docs/rules/cost-and-performance.md`, `docs/interface-brief-opinion-screen.md`, and the
  backend/testing sub-agents. Resolved the "exact hard-cap value" open item in `CLAUDE.md` §6.
- 2026-08-14 — Refined the token-budget design after real back-and-forth with the user: output
  length is controlled by **two mechanisms**, not one — a soft length instruction in the user
  message we construct (advocates ~1,000 tokens, judges ~500) plus a hard `max_tokens` API cap as
  backstop (1,300 / 700). Settled on asymmetric numbers deliberately: judges stay tight to avoid
  the named "returns prose" failure; advocates got more room than the original draft (600→1,000)
  after reconsidering that a focused argument doesn't need padding to be strong. Added a rule
  (`docs/rules/security-and-permissions.md`) clarifying the boundary this relies on: the `system`
  role is the teacher's prompt, untouched; the `user` role is ours to construct, including
  operational instructions. Updated `docs/cost-budget.md` §2/§3/§4, `docs/architecture.md`, and
  the backend/testing sub-agents to match.
- 2026-08-15 — User asked to actually activate Claude Code's agent-teams feature and use it to
  build the project. Set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `.claude/settings.local.json`
  (gitignored, machine-local). Took a session reload to actually go live. Spawned a real team —
  named teammates `backend`, `frontend`, `devops`, `testing`, reusing `.claude/agents/*.md` as
  their subagent-definition roles — to scaffold the app. Scaffolding proceeds with placeholders for
  the still-missing OpenRouter key and the 7 teacher prompts (user's explicit choice, over
  supplying them first).
- 2026-08-17 — **Reversal: agent config (model, system prompt, output-token limit) is now
  editable per agent from a new frontend Admin/Run Console**, with the teacher's prompt text as
  the seeded default — see [ADR-0014](decisions/0014-editable-agent-config-admin-console.md). This
  deliberately reverses the 2026-08-14 "system prompts never reach the browser, verbatim,
  never edited" rule for prompt text specifically; the OpenRouter key is explicitly excluded from
  the reversal and stays backend-only. The console is additive — a 4th screen alongside the
  already-specced submission form, results screen, and past-cases list, not a replacement of them
  (confirmed with the user). Added a persisted `agent_config` table (`docs/architecture.md` §3),
  a requirement that `call_log` rows snapshot the actual prompt/model/token-limit used per call
  rather than referencing the live (now-mutable) config (`docs/rules/audit-and-reliability.md`),
  and new backend requirements for live per-call streaming and a run-summary (cost/tokens/
  decisions) rollup. Updated `CLAUDE.md` §2/§5/§6, `docs/rules/security-and-permissions.md`,
  `docs/decisions/README.md`. Resolved the previously-open "vary model per call?" question as a
  side effect: the mechanism is now user-configurable per agent, not a code-level fixed choice.
- 2026-08-17 — Relaunched the agent team (backend, frontend, devops, testing all cancelled by an
  earlier interruption) with ADR-0014's scope baked into the kickoff prompts from the start.
  Discovered mid-run that teammates don't actually have a `SendMessage` tool in this harness (both
  `frontend` and `devops` reported this directly) — peer-to-peer agent-team messaging as described
  in Claude Code's docs isn't functioning here; the lead relays between teammates manually instead.
  `devops` delivered `Dockerfile`, `docker-compose.yml`, `.env.example`, `.dockerignore` for local
  dev, flagged as unverified against backend's actual code (which didn't exist yet) and untestable
  in this sandbox (no Docker installed).
- 2026-08-17 — **Correction: single-page UI, not the 3-screen + admin-console split.** User
  directly corrected an assumption: there's no admin/public audience split in this project at all
  — one page does case input, all 7 agents' config, Run, live streamed output, results, and a
  cost/tokens/time summary, with past runs as a history panel on that same page. See
  [ADR-0015](decisions/0015-single-page-console-ui.md). Added `docs/interface-brief-console.md`
  (supersedes `interface-brief-opinion-screen.md` and `interface-brief-admin-console.md`, both
  kept on disk marked superseded, not deleted). Updated `CLAUDE.md` §2/§5, `docs/architecture.md`
  §1/§5, `docs/decisions/README.md`. Backend/frontend teammates re-briefed accordingly.
- 2026-08-17 — **Production hosting moved from Render to AWS App Runner** — user asked directly,
  no longer wants Render. See [ADR-0016](decisions/0016-aws-app-runner-production.md), which
  supersedes only the production-hosting half of
  [ADR-0013](decisions/0013-docker-compose-local-render-production.md) (local Docker Compose is
  unaffected and stays as devops already built it). Chose App Runner over ECS Fargate (more
  AWS-native but more infra to build) and plain EC2 (least managed) for minimal footprint; kept
  Supabase-hosted Postgres over migrating to RDS (ADR-0011 unaffected) since there was no real
  reason to re-open that decision alongside this one. Updated `CLAUDE.md` §3, `docs/architecture.md`
  deployment row, `docs/decisions/README.md`, `.claude/agents/devops.md`. devops teammate notified
  to begin: push the existing Docker image to Amazon ECR, create the App Runner service, wire
  `OPENROUTER_API_KEY`/`DATABASE_URL` as environment config — AWS account/credential access not
  yet confirmed, flagged as an open item.
- 2026-08-17 — AWS deployment worked through two real blockers in sequence: (1) no AWS
  credentials existed in this environment at all — installed the AWS CLI, user generated an IAM
  user (`agent-deploy`) and provided keys via a gitignored `.env`, extracted into `~/.aws/` without
  ever displaying the values in the conversation; (2) that IAM user was denied on every actual
  action — first a permissions boundary blocked everything, then after the user removed it, the
  deeper cause surfaced: no identity-based policy was attached at all. User attached
  `AmazonEC2ContainerRegistryFullAccess`/`AWSAppRunnerFullAccess`/`IAMFullAccess` directly. Also
  installed Docker Desktop (previously missing, blocking the image build) after weighing it
  against building in AWS CodeBuild instead — user chose installing Docker locally. `devops`
  re-checking access as of this entry; result not yet in.
- 2026-08-17 — **Database engine changed again: MongoDB Atlas replaces Postgres/Supabase**, on top
  of everything above, same day. User provided an Atlas connection string directly. See
  [ADR-0017](decisions/0017-mongodb-atlas-database.md), superseding
  [ADR-0011](decisions/0011-supabase-postgres-database.md). This discards real, already-completed
  `backend` work (`lib/db/schema.ts`, `lib/db/queries.ts`, `lib/db/client.ts`, the `pg` dependency,
  boot-time migration via `instrumentation.ts`) built earlier the same day — not a small swap.
  Local Docker Compose's Postgres container is removed entirely (Atlas is remote-only, no local
  container needed for either environment, one fewer moving part than before). Real Atlas
  credentials arrived via direct chat message rather than a file — flagged to the user as worth
  rotating later, since that channel isn't as protected as the `.env`-file approach used for the
  AWS/OpenRouter keys; folded into `.env` as `MONGODB_URI` without repeating the value anywhere
  else. Updated `CLAUDE.md` §3, `docs/architecture.md` §1/§3/§6, `docs/decisions/README.md`.
  `backend`/`devops` re-briefed to rebuild the DB layer and drop the local Postgres container.
- 2026-08-18 — Full adversarial verification pass by `testing` against the real (now-working)
  pipeline: forced failure handling, retry logic (exactly 3 attempts, separate `call_logs`
  documents), the 21-call ceiling, and an independent re-check of ADR-0014's snapshot-immutability
  claim (didn't trust `backend`'s own test — re-ran it itself, confirmed) all verified with live
  data read directly from Atlas, not code review. Found `docs/framing.md` §3 item 5 stale —
  contradicted ADR-0014's deliberate prompt-exposure reversal. Fixed: item 5 now explicitly scopes
  "never exposed" to the OpenRouter key only, with a note pointing at ADR-0014 for why prompt text
  is excluded on purpose.
- 2026-08-18 — **First live production deployment.** Diagnosed the App Runner `CREATE_FAILED`
  root cause via CloudWatch logs: App Runner injects its own `HOSTNAME` env var at container
  runtime, overriding the Dockerfile's `ENV HOSTNAME=0.0.0.0` default — a known Next.js-standalone
  collision. Fixed by forcing it inline on `CMD` instead. Rebuilt and pushed the corrected image,
  deleted the dead service, created a fresh one, confirmed `RUNNING` with a real `200` response
  from the live app. **Real, avoidable mistake made along the way**: ran `aws apprunner
  describe-service` without filtering output and it printed the service's full environment
  variables — the real `OPENROUTER_API_KEY` and `MONGODB_URI` — into the conversation. User was
  informed immediately and asked to rotate both; **declined, citing time**, and explicitly
  instructed deployment to proceed with the unrotated credentials — an informed decision about
  their own credentials, not something withheld from them. `docs/deployment-runbook.md` §4 now
  documents the `--query`-filtering practice to prevent recurrence. Live URL is service-specific
  (changes if the service is ever recreated) — check `aws apprunner describe-service --query
  Service.ServiceUrl` rather than treating any URL as permanent.
