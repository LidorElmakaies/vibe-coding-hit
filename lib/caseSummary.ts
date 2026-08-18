// Best-effort derivation of short "defendant" / "act" display strings from the free-form charge
// sheet text, for the past-runs history list only (components/console/types.ts's
// PastRunSummary.defendant/.act). The Console's case input is a single free-text field
// ("Defendant, act, and the exact question…", see components/console/CaseInputBar.tsx) — there is
// no structured defendant/act field anywhere upstream, so this is a heuristic display aid, not a
// parsed fact. Never used for anything the judges/advocates see (they get the full, verbatim
// case_text) — only for the history panel's one-line label.

export interface CaseSummaryFields {
  defendant: string;
  act: string;
}

const FALLBACK = "(untitled)";
const MAX_FIELD_LEN = 60;

function truncate(s: string, max: number): string {
  const trimmed = s.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1).trimEnd() + "…";
}

/**
 * Splits on the first comma/period/newline as a loose "defendant, act" heuristic (matching the
 * textarea's own placeholder pattern). If no separator is found, the whole text (truncated) is
 * used as `act` and `defendant` falls back to a generic label — never fabricated content.
 */
export function deriveCaseSummary(caseText: string): CaseSummaryFields {
  const text = caseText.trim();
  if (!text) return { defendant: FALLBACK, act: FALLBACK };

  const sepMatch = text.match(/[,.\n]/);
  if (sepMatch && sepMatch.index !== undefined && sepMatch.index > 0) {
    const first = text.slice(0, sepMatch.index);
    const rest = text.slice(sepMatch.index + 1).trim();
    return {
      defendant: truncate(first, MAX_FIELD_LEN),
      act: rest ? truncate(rest, MAX_FIELD_LEN) : FALLBACK,
    };
  }

  return { defendant: FALLBACK, act: truncate(text, MAX_FIELD_LEN) };
}
