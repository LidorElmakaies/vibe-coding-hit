// GET /api/agent-config — the current, live config for all 7 agent roles. Read by the Console on
// load (components/console/api.ts's fetchAgentConfigs) to pre-fill the 7 config panels. Never
// fabricates a value if the DB is unreachable — returns a clear error instead (the Console's own
// contract already treats a failed fetch as "config unavailable," never a fake default; see
// app/page.tsx).

import { NextResponse } from "next/server";
import { listAgentConfigs } from "../../../lib/db/queries";
import type { AgentRole } from "../../../lib/constants";

export interface AgentConfigDTO {
  role: AgentRole;
  model: string;
  systemPrompt: string;
  maxTokens: number;
}

export async function GET() {
  try {
    const rows = await listAgentConfigs();
    const agents: AgentConfigDTO[] = rows.map((r) => ({
      role: r.role,
      model: r.model,
      systemPrompt: r.systemPrompt,
      maxTokens: r.maxTokens,
    }));
    return NextResponse.json({ agents });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ error: `Failed to load agent config: ${message}` }, { status: 500 });
  }
}
