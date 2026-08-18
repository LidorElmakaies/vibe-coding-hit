// GET /api/models — the curated OpenRouter model list the Console's dropdown(s) populate from
// (docs/interface-brief-console.md §2a: single-model-for-all and random-per-agent selection both
// render as an actual <select>, not free text). Purely static — no OpenRouter call, no secret
// involved, nothing here needs OPENROUTER_API_KEY. See lib/constants.ts's CURATED_MODELS for the
// list itself and how it was checked against OpenRouter's live catalog.

import { NextResponse } from "next/server";
import { CURATED_MODELS } from "../../../lib/constants";

export async function GET() {
  return NextResponse.json({ models: CURATED_MODELS });
}
