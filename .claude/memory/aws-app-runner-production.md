---
name: aws-app-runner-production
description: Production hosting moved from Render to AWS App Runner (2026-08-17, ADR-0016); local Docker Compose and Supabase Postgres are unaffected
metadata:
  type: project
---

Production hosting for agnet-project moved from Render (ADR-0013) to **AWS App Runner**, deploying
the same Dockerfile via Amazon ECR. User asked directly ("i dont want rancher anymore" — read as
Render, the only production-hosting name actually in this repo; unconfirmed but no Rancher exists
anywhere in the project). Chose App Runner over ECS Fargate (more AWS-native, more infra to build)
and plain EC2 (least managed, most ops burden) for minimal footprint, consistent with the
project's repeated "keep the stack minimal" rule. Database was Supabase-hosted Postgres at the
time of this decision — **since superseded again, see [[mongodb-atlas-database]]**: it's now
MongoDB Atlas (ADR-0017), same day. This ADR's App Runner choice itself is unaffected by that
later change; only the "keep Supabase, don't move to RDS" reasoning below is now moot.

**Why:** User's direct infrastructure preference — recorded so future sessions/teammates don't
propose or half-build Render config, and don't assume the database needs to move just because
compute did.

**How to apply:** Full reasoning in
[ADR-0016](../../docs/decisions/0016-aws-app-runner-production.md), which supersedes only the
production-hosting half of
[ADR-0013](../../docs/decisions/0013-docker-compose-local-render-production.md) — local Docker
Compose stands unchanged, already built and locally verified (without Docker itself, via a manual
`npm run build` + `node server.js` dry run) by the `devops` teammate. Devops scope now includes:
push the existing image to ECR, create the App Runner service, wire
`OPENROUTER_API_KEY`/`DATABASE_URL` as environment config. **AWS account/credential access is not
yet confirmed** — check before assuming any of this is actually runnable, not just written.
Updated `CLAUDE.md` §3, `docs/architecture.md` deployment row, `docs/decisions/README.md`,
`.claude/agents/devops.md`. Related: [[agent-teams-feature-plan]].
