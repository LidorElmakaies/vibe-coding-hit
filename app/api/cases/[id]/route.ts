// GET /api/cases/:id — full detail for reopening a past run read-only (components/console's
// handleOpenPastRun). Returns every agent's frozen model/systemPrompt/maxTokens as actually used
// for that call (from advocate_output/verdict, not the live, possibly-since-edited agent_config —
// see docs/rules/audit-and-reliability.md).

import { NextResponse } from "next/server";
import { getCase, listAdvocateOutputs, listVerdicts } from "../../../../lib/db/queries";
import { deriveCaseSummary } from "../../../../lib/caseSummary";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const caseRow = await getCase(id);
    if (!caseRow) {
      return NextResponse.json({ error: `No case found with id: ${id}` }, { status: 404 });
    }

    const [advocateOutputs, verdicts] = await Promise.all([
      listAdvocateOutputs(id),
      listVerdicts(id),
    ]);

    const { defendant, act } = deriveCaseSummary(caseRow.caseText);

    const agents = [
      ...advocateOutputs.map((a) => ({
        role: a.role,
        model: a.model,
        systemPrompt: a.systemPrompt,
        maxTokens: a.maxTokens,
        output: a.output,
        failed: a.failed,
      })),
      ...verdicts.map((v) => ({
        role: v.role,
        model: v.model,
        systemPrompt: v.systemPrompt,
        maxTokens: v.maxTokens,
        output: v.output,
        failed: v.failed,
        judgeResult:
          v.verdictLabel && v.reasons ? { verdict: v.verdictLabel, reasons: v.reasons } : undefined,
      })),
    ];

    const summary =
      caseRow.totalTokens === null && caseRow.totalCostUsd === null && caseRow.totalTimeMs === null
        ? null
        : {
            totalTokens: caseRow.totalTokens ?? 0,
            totalCostUsd: caseRow.totalCostUsd ?? 0,
            totalTimeMs: caseRow.totalTimeMs ?? 0,
          };

    return NextResponse.json({
      id: caseRow.id,
      defendant,
      act,
      // `question` mirrors the full case text — the Console's case input is a single free-text
      // field (no separate structured "question"), see lib/caseSummary.ts's header comment. Kept
      // for compatibility with the frontend's provisional PastRunDetail shape rather than dropped.
      question: caseRow.caseText,
      caseText: caseRow.caseText,
      submittedAt: caseRow.submittedAt,
      status: caseRow.status,
      agents,
      summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ error: `Failed to load case ${id}: ${message}` }, { status: 500 });
  }
}
