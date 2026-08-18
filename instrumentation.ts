// Next.js instrumentation hook — `register()` runs once when the server process starts, before
// it serves any request (stable since Next 15, no experimental flag needed). Used here purely to
// apply the idempotent MongoDB index creation + agent_configs seed (lib/db/setup.ts) on boot, in
// both `npm run dev` and the Docker "runner" image (Dockerfile/docker-compose.yml), without a
// separate manual step or extra tooling. MongoDB needs no DDL/migration chain the way the earlier
// Postgres version did (ADR-0017) — collections are created implicitly on first write; "setup"
// here means only ensuring indexes exist and the 7 agent_config documents are seeded.
//
// Guarded to the Node.js runtime only — this file also runs once for the Edge runtime bundle if
// one exists, and the `mongodb` driver (a Node module) can't load there. This project has no Edge
// routes, but the guard is cheap and correct regardless.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureDb } = await import("./lib/db/setup");
    try {
      await ensureDb();
      console.log("[db] indexes ensured / agent_configs seeded (if not already present)");
    } catch (err) {
      // Don't crash the whole server on a DB hiccup at boot (e.g. Atlas briefly unreachable) —
      // every route that actually needs the DB will surface its own clear error via
      // lib/db/client.ts. This is a best-effort convenience, not the only place setup issues
      // would be caught.
      console.error("[db] setup step failed at startup:", err);
    }
  }
}
