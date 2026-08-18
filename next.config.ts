import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output mode: the build emits a self-contained .next/standalone/server.js plus the
  // minimal node_modules subset it actually needs, instead of requiring the whole node_modules
  // tree + source at runtime. This is what the Dockerfile's "runner" stage copies — see
  // Dockerfile and ADR-0013 (docs/decisions/0013-docker-compose-local-render-production.md).
  output: "standalone",
};

export default nextConfig;
