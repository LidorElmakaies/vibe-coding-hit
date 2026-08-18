// GET /api/cases — the past-runs history list (components/console/PastRunsPanel.tsx). Every Run
// persists a `cases` row regardless of outcome (ADR-0015/interface-brief-console.md's open item,
// resolved here: "persist regardless, mark failed runs as failed in the history too") — so this
// list is a straight read of the cases table, most recent first.

import { NextResponse } from "next/server";
import { listCases } from "../../../lib/db/queries";
import { deriveCaseSummary } from "../../../lib/caseSummary";

export async function GET() {
  try {
    const rows = await listCases();
    const cases = rows.map((r) => {
      const { defendant, act } = deriveCaseSummary(r.caseText);
      return {
        id: r.id,
        defendant,
        act,
        submittedAt: r.submittedAt,
        status: r.status,
      };
    });
    return NextResponse.json({ cases });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ error: `Failed to load past runs: ${message}` }, { status: 500 });
  }
}
