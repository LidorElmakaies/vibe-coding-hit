# ADR-0016: AWS App Runner for Production (Supersedes Render in ADR-0013)

**Status:** Accepted (2026-08-17) — supersedes the production-hosting half of
[ADR-0013](0013-docker-compose-local-render-production.md)
**Modules:** 7 (deployment "earns respect"), 5 (minimal-footprint)

## Context

ADR-0013 picked Docker Compose for local dev and Render for future production hosting. The user
has now directly asked to move production hosting to AWS instead — Render is dropped. Local dev is
explicitly unaffected: Docker Compose stays exactly as ADR-0013 and devops already built it
(`Dockerfile`, `docker-compose.yml`, `.env.example`), since ADR-0013's core principle — one
Dockerfile, one execution model, local matches production — doesn't depend on which host runs that
Dockerfile in production.

## Options Considered

**A. AWS App Runner. (Chosen)** Points at a container image (in Amazon ECR) or a source
repository; AWS handles scaling, HTTPS, and the load balancer. Closest AWS equivalent to what
Render was offering — least new infrastructure to build/operate, matching this project's
"keep the stack minimal" rule.

**B. Amazon ECS on Fargate.** More AWS-native and more configurable (VPC networking, task
definitions, service auto-scaling policies, an Application Load Balancer), but meaningfully more
infrastructure to define and maintain for a class project whose grading target is agent-direction
skill, not infra depth.

**C. A plain EC2 instance running `docker compose up` directly.** Closest to local dev
conceptually, but pushes OS patching, process supervision, and restart-on-crash onto us instead of
a managed service — the opposite of "keep it minimal."

## Decision

**AWS App Runner**, deploying the same Dockerfile devops already built (image pushed to Amazon
ECR). **Database: keep Supabase's hosted Postgres** (ADR-0011 is unaffected) — the App
Runner-hosted app connects to it over the network via `DATABASE_URL`, exactly like any other
remote database; moving to RDS was considered and explicitly declined to avoid re-litigating
ADR-0011 without a real reason to.

## Why It's Better Than the Alternatives

- Smallest new-infrastructure footprint of the three that still gets a real, managed, HTTPS-
  fronted production deployment — App Runner is closer in spirit to what Render was doing than
  ECS/Fargate's fuller AWS-native surface.
- Reuses the existing single Dockerfile without modification — ADR-0013's "one execution model,
  local matches production" principle survives the host change intact.
- Not re-opening ADR-0011 (database engine/hosting) avoids compounding this pivot with a second,
  unrelated one; Supabase's Postgres is reachable from anywhere with a connection string, AWS
  compute included.

## Consequences

- **New devops scope**: push the existing image to Amazon ECR (manually or via CI), create an App
  Runner service pointed at it, and wire `OPENROUTER_API_KEY`/`DATABASE_URL` as App Runner
  environment variables (or via AWS Secrets Manager for the key specifically — devops's call,
  consistent with "no secret baked into an image layer").
- **Requires an AWS account and credentials** — not yet confirmed to exist; flag as an open item
  until devops/the user confirms access.
- **ADR-0013 is marked superseded for its production-hosting half only** — its local Docker
  Compose decision and reasoning stand unchanged; only "Render for production" is replaced.
- **Nothing about the local dev story changes** — `docker compose up` remains the entire local
  setup, per ADR-0013, verified working by devops independent of this ADR.
