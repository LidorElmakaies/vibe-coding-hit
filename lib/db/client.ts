// Single shared MongoDB connection for the whole process. Raw official `mongodb` driver, no
// Mongoose/ODM — ADR-0017 applies ADR-0010's "raw SDK over a framework" reasoning to the database
// too, the same way lib/openrouter/client.ts does for OpenRouter. Supersedes the earlier Postgres
// client (ADR-0011) — see ADR-0017 (docs/decisions/0017-mongodb-atlas-database.md).
//
// Atlas is a single, always-remote, already-hosted cluster — unlike the old Postgres setup there
// is no "local container vs. hosted instance" split; local dev and production both connect via
// the same `MONGODB_URI` env var, exactly like `OPENROUTER_API_KEY` already worked.
//
// Next.js can construct route-handler modules multiple times in dev (HMR); stash the connect
// promise on `globalThis` so repeated module reloads reuse one connection instead of leaking
// sockets/reconnecting on every request.

import { MongoClient, type Db } from "mongodb";

declare global {
  var __agnetMongoClientPromise: Promise<MongoClient> | undefined;
}

// Database name within the Atlas cluster — not specified anywhere else in the project's docs, so
// picked here (see this agent's status report). Overridable via MONGODB_DB_NAME for a future
// local/prod split without a code change, per ADR-0013's "one execution model" principle.
const DB_NAME = process.env.MONGODB_DB_NAME?.trim() || "agnet";

function createClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env (local) or set it in the deployment " +
        "environment (see docs/rules/security-and-permissions.md — this is not a secret the " +
        "browser ever sees, but it must be present server-side)."
    );
  }
  const client = new MongoClient(uri);
  return client.connect();
}

export function getMongoClientPromise(): Promise<MongoClient> {
  if (!globalThis.__agnetMongoClientPromise) {
    globalThis.__agnetMongoClientPromise = createClientPromise();
  }
  return globalThis.__agnetMongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClientPromise();
  return client.db(DB_NAME);
}
