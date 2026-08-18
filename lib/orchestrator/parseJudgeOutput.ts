// Best-effort structured extraction of {verdict, reasons} from a judge's raw output text, keyed
// to the exact trailer format requested in bundle.ts's JUDGE_TRAILER_INSTRUCTION. This is a
// convenience for the Console's "verdicts first" hierarchy (docs/interface-brief-console.md §2) —
// it is NEVER allowed to invent a verdict. If the expected lines aren't found (a model ignored the
// format), this returns `null` and the raw output text remains the source of truth shown to the
// user — see docs/rules/audit-and-reliability.md's named anti-pattern: a malformed judge response
// must never silently read as e.g. "not guilty." Returning null, not a guess, is what prevents
// that here.

export interface ParsedJudgeResult {
  verdict: string;
  reasons: string[];
}

const VERDICT_LINE = /^VERDICT:\s*(.+)$/im;
const REASONS_LINE = /^REASONS:\s*(.+)$/im;

export function parseJudgeOutput(rawOutput: string): ParsedJudgeResult | null {
  const verdictMatch = rawOutput.match(VERDICT_LINE);
  const reasonsMatch = rawOutput.match(REASONS_LINE);

  if (!verdictMatch || !reasonsMatch) return null;

  const verdict = verdictMatch[1].trim();
  const reasons = reasonsMatch[1]
    .split("|")
    .map((r) => r.trim())
    .filter((r) => r.length > 0);

  if (!verdict || reasons.length === 0) return null;

  return { verdict, reasons };
}
