# Deployment Runbook — AWS App Runner

> The concrete, step-by-step "how do I actually deploy this" doc — companion to
> [ADR-0016](decisions/0016-aws-app-runner-production.md) (why AWS App Runner) and
> [ADR-0017](decisions/0017-mongodb-atlas-database.md) (why MongoDB Atlas). ADRs explain the
> *decisions*; this explains the *procedure*. Written 2026-08-18 from the actual steps used to get
> this project's first deployment working, including the real problems hit along the way.

## 0. One-time prerequisites (already done for this project)

- AWS account with an IAM user (`agent-deploy`) that has: `AmazonEC2ContainerRegistryFullAccess`,
  `AWSAppRunnerFullAccess`, `IAMFullAccess` (needed once so App Runner can create its own ECR-pull
  role — see step 3), `CloudWatchLogsReadOnlyAccess` (for debugging deploy failures), and **no
  permissions boundary** restricting the above.
- AWS CLI installed and configured (`aws configure`) with that user's access key/secret.
- Docker Desktop installed and running.
- A MongoDB Atlas cluster with a database user (username/password) that has read/write access, and
  the connecting IP allowlisted under Atlas's Network Access (or `0.0.0.0/0` for simplicity).
- A real OpenRouter API key.

## 1. Build the image locally

```
docker build -t agnet-project:latest .
```

The `Dockerfile` uses Next.js standalone output mode — one image, same one used for local
`docker compose up` and production (ADR-0013's "one execution model" principle).

**Known gotcha, already fixed in this repo's Dockerfile**: AWS App Runner injects its own
`HOSTNAME` environment variable at container runtime (the platform's internal hostname), which
silently overrides a plain `ENV HOSTNAME=0.0.0.0` in the image — causing the Next.js standalone
server to bind to an unreachable address and the deployment to fail its health check
(`CREATE_FAILED`) even though the app itself started fine. Fixed by forcing the value inline on
the actual `CMD`, which can't be overridden the same way:
```dockerfile
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 node server.js"]
```
If you ever "simplify" this back to a plain `ENV HOSTNAME=0.0.0.0` + `CMD ["node", "server.js"]`,
the deployment will fail again the same way. Don't.

## 2. Push the image to Amazon ECR

```
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag agnet-project:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/agnet-project:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/agnet-project:latest
```

(The ECR repository itself — `aws ecr create-repository --repository-name agnet-project --region us-east-1` —
only needs creating once; already done for this project.)

## 3. Create (or update) the App Runner service

First time, via the AWS Console (App Runner → Create service) or CLI, pointing at:
- **Source**: the ECR image pushed above, `latest` tag.
- **Access role**: App Runner needs an IAM role to pull from ECR on your behalf — it can create
  one for you automatically the first time (`AppRunnerECRAccessRole`), which is why the
  `agent-deploy` user needed `IAMFullAccess` — it's only used to create that one role, once.
- **Environment variables**: `OPENROUTER_API_KEY`, `MONGODB_URI`, `NODE_ENV=production`,
  `PORT=3000`.
- **Port**: `3000` (must match the Dockerfile's `EXPOSE`/`ENV PORT`).

**If a previous deployment attempt is stuck `CREATE_FAILED`**: delete it and create fresh, rather
than trying to update it in place — a failed initial deployment doesn't reliably recover via
`update-service`.

## 4. Wait for it to go healthy

```
aws apprunner describe-service --service-arn <arn> --region us-east-1 --query "Service.Status"
```

Watch for `RUNNING` (typically 2-5 minutes: pulling the image, provisioning, health-checking).
**If it fails**, don't guess — read the actual logs:
```
aws logs describe-log-groups --region us-east-1 --log-group-name-prefix "/aws/apprunner/<service-name>"
aws logs get-log-events --region us-east-1 --log-group-name "<...>/service" --log-stream-name "events"
aws logs get-log-events --region us-east-1 --log-group-name "<...>/application" --log-stream-name "<instance-stream>"
```
The `/service` log group has the platform-level deployment narrative (health check pass/fail,
image pull status); `/application` has the actual app's stdout/stderr — that's where you'd see it
genuinely start up (or crash) before the health check even runs.

**Security note, learned the hard way**: `aws apprunner describe-service` prints the full service
configuration **including plaintext runtime environment variables** — meaning your real secrets
print in full if you run that command carelessly (e.g., piped straight to a terminal someone's
watching, or into a log/chat that gets persisted). Use `--query` to filter to only the fields you
actually need (e.g., `--query "Service.Status"`) rather than dumping the whole object, whenever
secrets are involved.

## 5. Get the public URL

```
aws apprunner describe-service --service-arn <arn> --region us-east-1 --query "Service.ServiceUrl"
```

App Runner services are publicly routable over HTTPS by default (`IsPubliclyAccessible: true`) —
no VPN, no additional networking setup. That URL is reachable from anywhere.

## 5a. Known gotcha: `docker login` to ECR can fail with `400 Bad Request` even with valid credentials

Hit this on this machine (2026-08-18): `aws ecr get-login-password | docker login --username AWS
--password-stdin ...` failed with `400 Bad Request` from Docker Desktop's daemon, even though the
token itself was completely valid (confirmed by testing raw HTTP Basic Auth against the registry's
`/v2/` endpoint directly — `200 OK`). Restarting Docker Desktop did not fix it. Root cause not
fully diagnosed (likely a Docker Desktop bug in its ECR login path specifically, not an AWS-side
or credentials issue) — but there's a reliable workaround:

1. Get the token: `$pw = aws ecr get-login-password --region us-east-1`
2. Build the Basic-auth string it will need: `[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("AWS:$pw"))`
3. Write it directly into `~/.docker/config.json`'s `auths` section for that registry, **with
   `credsStore` removed from the file** (if `credsStore` is present, Docker CLI delegates entirely
   to the external credential helper and ignores the plaintext `auths` entry — this is *why* just
   adding the `auths` entry alone doesn't work; it only takes effect once `credsStore` is absent).
4. `docker push` now works, since the CLI reads the manual `auths` entry directly.
5. Restore `credsStore: "desktop"` afterward (or just clear `auths` back to `{}`) so normal
   Docker Desktop credential behavior resumes for everything else.

## 6. Redeploying after a code change

```
docker build -t agnet-project:latest .
docker tag agnet-project:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/agnet-project:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/agnet-project:latest
aws apprunner start-deployment --service-arn <arn> --region us-east-1
```

`AutoDeploymentsEnabled` is currently `false` for this service (deliberate — see
[ADR-0016](decisions/0016-aws-app-runner-production.md) and the CI/CD discussion below) — pushing
a new image to ECR does *not* automatically redeploy; `start-deployment` triggers it explicitly.

## 7. What GitHub does here (updated 2026-08-18 — CI/CD is now set up)

**Superseded**: this section originally said pushing to GitHub does nothing and CI/CD was
deliberately deferred. The user reversed that call the same day — `.github/workflows/deploy.yml`
now runs on every push to `main`: build the image → push to ECR (both `:latest` and a `:<commit
sha>` tag) → `aws apprunner start-deployment` → poll until `RUNNING` or fail the workflow.

**One-time setup still needed, not automatable from here**: the workflow needs two repository
secrets, set via **GitHub → this repo → Settings → Secrets and variables → Actions → New
repository secret**:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

(the `agent-deploy` IAM user's credentials — same ones already in local `.env`/AWS CLI config).
This is the correct, secure place for them — GitHub encrypts repository secrets and never exposes
them in logs, unlike pasting into a chat conversation (see the 2026-08-18 decisions-log entry on
exactly that mistake). No CLI tool on this machine (`gh` isn't installed) could set these
non-interactively, so this one step is on the user, done once, through GitHub's own UI.

Until those two secrets exist, the workflow will run on every push but fail at the "Configure AWS
credentials" step — that's expected, not a sign anything else is broken.

## 8. Credential rotation (if a secret is ever exposed, like it was here)

1. **OpenRouter**: [openrouter.ai/keys](https://openrouter.ai/keys) → revoke old, generate new.
2. **MongoDB Atlas**: Database Access → the user → Edit Password → set new.
3. Update the local `.env` (never commit it — already gitignored).
4. Re-run step 3/4 above (App Runner needs the new values in its own environment config — it
   doesn't read your local `.env` file, they're separate).

## 9. Deploying via the AWS Console (UI), not the CLI

Steps 1-2 (build and push the image) still happen locally via Docker/CLI — there's no UI for
building a container image. Everything from "create the service" onward has a console equivalent:

### If a previous failed attempt needs deleting first
1. AWS Console → search **"App Runner"** → open it.
2. Left sidebar → **Services**.
3. Find the service (status shows **"Create failed"** in red if it's the stuck one from before).
4. Select its checkbox → **Actions → Delete** → type the service name to confirm → **Delete**.

### Creating the service
1. App Runner console → **Create an App Runner service** (big button, top right).
2. **Step 1 — Source and deployment**:
   - Repository type: **Container registry**
   - Provider: **Amazon ECR**
   - Container image URI: **Browse** → pick the `agnet-project` repository → the `latest` tag (or
     paste `<account-id>.dkr.ecr.us-east-1.amazonaws.com/agnet-project:latest` directly)
   - Deployment trigger: **Manual** (matches "not doing auto-deploy yet," §7 above)
   - ECR access role: **Create new service role** the first time (this creates
     `AppRunnerECRAccessRole` for you); reuse the existing one on later services
   - **Next**
3. **Step 2 — Configure service**:
   - Service name: e.g. `agnet-project`
   - vCPU / memory: defaults (1 vCPU / 2 GB) are fine
   - **Environment variables** section → **Add environment variable**, once each for:
     `OPENROUTER_API_KEY`, `MONGODB_URI`, `NODE_ENV` (`production`), `PORT` (`3000`)
   - Port: `3000`
   - Health check: TCP on port 3000 (default) is fine now that the Dockerfile's `HOSTNAME` fix
     (§1 above) is in the image — this exact setting is what failed before the fix
   - Auto scaling / Security / Networking: defaults are fine — **Networking** should show
     **"Public endpoint"**, which is what makes the URL reachable from anywhere
   - **Next**
4. **Step 3 — Review and create** → check the settings → **Create & deploy**.
5. Status shows **"Operation in progress"** then **"Running"** once healthy (a few minutes) —
   refresh the page or watch it update live.

### Watching it deploy / debugging a failure, without the CLI
- Service page → **Logs** tab shows both deployment-level events and the application's own
  stdout/stderr, directly in the console — no `aws logs get-log-events` needed.
- Service page → **Activity** tab shows the deployment history.

### Getting the URL
- Service overview page, near the top: **"Default domain"** — that's the public HTTPS URL,
  reachable from anywhere immediately.
