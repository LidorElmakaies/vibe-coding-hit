# Deployment

One Docker image, three consumers: local `docker compose`, manual/CLI production deploys to AWS
App Runner, and an automated GitHub Actions workflow that does the same production deploy on every
push to `main`.

## The image

`Dockerfile` — multi-stage, `node:22-alpine` (Node ≥22 required by the `openai` SDK dependency),
Next.js **standalone** output (`next.config.ts`'s `output: "standalone"`):

1. `deps` — `npm ci` only, its own cached layer.
2. `builder` — copies `node_modules` from `deps`, copies the full source, `npm run build` with
   `NEXT_TELEMETRY_DISABLED=1`.
3. `runner` — copies only `public/`, `.next/standalone`, and `.next/static` from `builder`; runs as
   a non-root `nextjs` user (uid/gid 1001); no source, no full `node_modules`, no build tooling in
   the final image.

No secret is ever `COPY`'d or `ARG`'d into any layer — `OPENROUTER_API_KEY` and `MONGODB_URI`
reach the running container only via `docker compose`'s `env_file` locally, or App Runner's
environment configuration in production.

**The `HOSTNAME` fix** (`Dockerfile`'s final `CMD`):
```dockerfile
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 node server.js"]
```
AWS App Runner injects its own `HOSTNAME` environment variable at container runtime (the
platform's internal EC2 hostname, e.g. `ip-10-0-x-x.ec2.internal`), which overrides a plain
image-level `ENV HOSTNAME=0.0.0.0` default. The Next.js standalone server then binds to that
unreachable platform hostname instead of `0.0.0.0`, so App Runner's TCP health check against the
container's port can never succeed and the deployment permanently fails (`CREATE_FAILED`) even
though the app itself started fine. Forcing `HOSTNAME=0.0.0.0` inline as part of the literal `CMD`
(rather than as an `ENV` default) survives the platform's env-var injection, since it's baked into
the exact command that runs, not a default the injected variable can shadow. Confirmed via
CloudWatch logs during the 2026-08-17 deployment. Reverting to a plain `ENV HOSTNAME=0.0.0.0` +
`CMD ["node", "server.js"]` reintroduces the failure — noted directly in both the Dockerfile and
`docs/deployment-runbook.md` as a "don't."

## Local development

`docker-compose.yml` — one service, `app`, built from the same `Dockerfile`, `env_file: [.env]`,
port `3000:3000`. No local database container: MongoDB Atlas is a single, always-remote, hosted
cluster — local dev and production connect to it via the same `MONGODB_URI`, so there is nothing
to run locally beyond the app container itself (unlike the earlier Postgres design this superseded).

```
docker compose up            # first run / no Dockerfile changes
docker compose up --build    # after a Dockerfile or dependency change
```

Prerequisite: a `.env` file (gitignored, copied from `.env.example`) with real `OPENROUTER_API_KEY`
and `MONGODB_URI` values.

## Environment variables

From `.env.example`, cross-checked against every place each is actually read:

| Variable | Required | Read in | Notes |
|---|---|---|---|
| `OPENROUTER_API_KEY` | Yes | `lib/openrouter/client.ts` (only place) | Never reaches the browser or any response body — see [`architecture.md`](architecture.md) §3. |
| `MONGODB_URI` | Yes | `lib/db/client.ts` (only place) | Format: `mongodb+srv://<user>:<password>@<cluster>/?appName=<...>`. Same string for local dev and production — no local/prod split mechanism exists yet. |
| `MONGODB_DB_NAME` | No | `lib/db/client.ts` | Defaults to `"agnet"` if unset. Exists specifically to allow a future local/prod database split without a code change — not yet used that way. |
| `NODE_ENV` | No (but set) | Next.js itself | Set to `production` by the Dockerfile's `runner` stage and again explicitly in `.env.example`/App Runner's env config. |
| `PORT` | No (but set) | Next.js itself / Dockerfile `ENV` | `3000` everywhere — must match the Dockerfile's `EXPOSE` and App Runner's configured port. |

Where each is actually set, per environment:
- **Local**: `.env` file, read by `docker compose` via `env_file`.
- **Production (App Runner)**: set directly on the App Runner service's environment-variable
  configuration (console or `aws apprunner create-service`/`update-service`) — App Runner does not
  read the repo's `.env`/`.env.example` at all.
- **CI (GitHub Actions)**: the workflow itself needs no application env vars (it only builds and
  pushes the image, then tells App Runner to redeploy using App Runner's own already-configured
  environment) — it needs exactly two **repository secrets** instead, see below.

## Production: AWS App Runner via Amazon ECR

One image, pushed to one ECR repository (`agnet-project`), one App Runner service pulling from it.

```
docker build -t agnet-project:latest .
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag agnet-project:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/agnet-project:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/agnet-project:latest
aws apprunner start-deployment --service-arn <arn> --region us-east-1
```

Key facts about the live service (from `.github/workflows/deploy.yml`'s `env:` block, which is not
secret — account id, region, and ARN are all plain config):
- Region: `us-east-1`
- ECR registry: `462977977759.dkr.ecr.us-east-1.amazonaws.com`, repository `agnet-project`
- Service ARN: `arn:aws:apprunner:us-east-1:462977977759:service/agnet-project/f741714b5fbf473185e8c0cb00f837c8`
- `AutoDeploymentsEnabled` is **`false`** on the service — pushing a new image to ECR alone does not
  trigger a redeploy; an explicit `aws apprunner start-deployment` (done by hand, or by the CI
  workflow) is required every time.
- IAM: an `agent-deploy` user with `AmazonEC2ContainerRegistryFullAccess`,
  `AWSAppRunnerFullAccess`, `IAMFullAccess` (needed once, to let App Runner create its own
  `AppRunnerECRAccessRole` ECR-pull role), `CloudWatchLogsReadOnlyAccess`.
- Health check: TCP on port 3000 — this is exactly the check that silently fails without the
  `HOSTNAME` fix above.
- Networking: public endpoint by default — the service's URL is reachable from anywhere over HTTPS
  with no additional networking setup.

### The ECR `docker login` bug and its workaround

Hit on the deploying machine (2026-08-18): `aws ecr get-login-password | docker login --username AWS
--password-stdin ...` failed with `400 Bad Request` from Docker Desktop's daemon, even though the
token itself was valid (confirmed by testing raw HTTP Basic Auth against the registry's `/v2/`
endpoint directly — `200 OK`). Restarting Docker Desktop did not fix it; root cause not fully
diagnosed, but a reliable workaround exists:

1. `$pw = aws ecr get-login-password --region us-east-1`
2. Base64-encode `"AWS:$pw"` (`[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("AWS:$pw"))`).
3. Write that value directly into `~/.docker/config.json`'s `auths` section for the ECR registry,
   **with `credsStore` removed from the file** — if `credsStore` is present, the Docker CLI
   delegates entirely to the external credential helper and ignores a plaintext `auths` entry,
   which is why adding the `auths` entry alone (without removing `credsStore`) doesn't work.
4. `docker push` now succeeds, reading the manual `auths` entry directly.
5. Restore `credsStore: "desktop"` afterward so normal Docker Desktop credential behavior resumes.

## CI/CD: `.github/workflows/deploy.yml`

Triggers on every push to `main`. Steps:
1. Check out code.
2. Configure AWS credentials from two repository secrets (`AWS_ACCESS_KEY_ID`,
   `AWS_SECRET_ACCESS_KEY` — the `agent-deploy` IAM user's own credentials, set once via GitHub →
   repo → Settings → Secrets and variables → Actions).
3. `aws-actions/amazon-ecr-login@v2`.
4. Build and push the image, tagged both `:latest` and `:${{ github.sha }}`.
5. `aws apprunner start-deployment --service-arn "$APP_RUNNER_SERVICE_ARN"`.
6. Poll `aws apprunner describe-service ... --query "Service.Status"` up to 40 times, 15s apart
   (~10 minutes total): exit success on `RUNNING`, exit failure if the status contains `FAILED`,
   exit failure if the loop exhausts without reaching `RUNNING`.

Until the two repository secrets are set, the workflow runs on every push but fails at the
"Configure AWS credentials" step — expected, not a sign of anything else being broken. No CLI tool
available on the machine that authored the workflow (`gh` not installed) could set these
non-interactively; this is the one manual, one-time step left to whoever administers the repo.

## Security note on debugging App Runner

`aws apprunner describe-service` (without `--query`) prints the **full service configuration,
including plaintext runtime environment variables** — i.e., the real `OPENROUTER_API_KEY` and
`MONGODB_URI` values print in full. Always scope with `--query` (e.g. `--query "Service.Status"` or
`--query "Service.ServiceUrl"`) when secrets are involved, rather than dumping the whole object to a
terminal, log, or chat that might persist it.

## Credential rotation (if a secret is ever exposed)

1. OpenRouter: [openrouter.ai/keys](https://openrouter.ai/keys) → revoke old, generate new.
2. MongoDB Atlas: Database Access → the user → Edit Password → set new.
3. Update local `.env` (gitignored, never committed).
4. Update App Runner's own environment configuration with the new values — App Runner does not
   read the local `.env` file; the two are entirely separate, so rotating locally has no effect on
   production until the service's own env vars are updated and it's redeployed.
