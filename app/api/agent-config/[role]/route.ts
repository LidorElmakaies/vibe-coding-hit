// PUT /api/agent-config/:role — edits one agent's model/systemPrompt/maxTokens. This is the
// mechanism ADR-0014 describes: the teacher's text is the seeded default (see prompts/index.ts,
// lib/db/migrate.ts); this endpoint lets the Console's user override it going forward. It does
// NOT rewrite any past run's call_log rows — those are frozen at call time regardless of later
// edits here (docs/rules/audit-and-reliability.md).
//
// maxTokens is silently clamped to the hard per-role ceiling from docs/cost-budget.md §2
// (1,300 advocates / 700 judges) — the editable field is a UI convenience, not a way to remove the
// economic-blast-radius cap (docs/cost-budget.md §5). The clamped value is returned in the
// response so the Console can reflect what was actually saved.

import { NextResponse } from "next/server";
import { updateAgentConfig } from "../../../../lib/db/queries";
import { clampMaxTokens, isAgentRole } from "../../../../lib/constants";

interface PutBody {
  model?: unknown;
  systemPrompt?: unknown;
  maxTokens?: unknown;
}

export async function PUT(request: Request, context: { params: Promise<{ role: string }> }) {
  const { role } = await context.params;
  if (!isAgentRole(role)) {
    return NextResponse.json({ error: `Unknown agent role: ${role}` }, { status: 404 });
  }

  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const patch: { model?: string; systemPrompt?: string; maxTokens?: number } = {};

  if (body.model !== undefined) {
    if (typeof body.model !== "string" || !body.model.trim()) {
      return NextResponse.json({ error: "model must be a non-empty string." }, { status: 400 });
    }
    patch.model = body.model.trim();
  }
  if (body.systemPrompt !== undefined) {
    if (typeof body.systemPrompt !== "string") {
      return NextResponse.json({ error: "systemPrompt must be a string." }, { status: 400 });
    }
    patch.systemPrompt = body.systemPrompt;
  }
  if (body.maxTokens !== undefined) {
    if (typeof body.maxTokens !== "number" || !Number.isFinite(body.maxTokens) || body.maxTokens <= 0) {
      return NextResponse.json({ error: "maxTokens must be a positive number." }, { status: 400 });
    }
    patch.maxTokens = clampMaxTokens(role, body.maxTokens);
  }

  try {
    const updated = await updateAgentConfig(role, patch);
    if (!updated) {
      return NextResponse.json({ error: `Agent config row not found for role: ${role}` }, { status: 404 });
    }
    return NextResponse.json({
      role: updated.role,
      model: updated.model,
      systemPrompt: updated.systemPrompt,
      maxTokens: updated.maxTokens,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ error: `Failed to save agent config: ${message}` }, { status: 500 });
  }
}
