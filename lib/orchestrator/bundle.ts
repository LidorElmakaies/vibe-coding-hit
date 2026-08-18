// Builds each call's USER message. Per docs/cost-budget.md §2a / docs/rules/security-and-
// permissions.md: the `system` role always carries whatever prompt is currently configured for
// that agent verbatim (teacher's default, or a Console user's edit) — we never touch it. The
// `user` role is ours to construct: the case text plus our own operational instructions (a soft
// length target, and — for judges only — a fixed trailer format we ask for so the verdict/reasons
// can be parsed without guessing at freeform prose). Neither instruction is prompt content; both
// are the kind of "here's the case, and here's how to format your answer" wrapper this project's
// rules explicitly reserve for the user message.

import { SOFT_LENGTH_TARGET, type AgentRole } from "../constants";

const ROLE_LABEL: Record<string, string> = {
  "defense-1": "Defense Advocate #1",
  "defense-2": "Defense Advocate #2",
  "prosecution-1": "Prosecution Advocate #1",
  "prosecution-2": "Prosecution Advocate #2",
};

export function buildAdvocateUserMessage(caseText: string): string {
  return [
    "Case:",
    '"""',
    caseText.trim(),
    '"""',
    "",
    `Respond with your argument for this case. Limit your answer to approximately ` +
      `${SOFT_LENGTH_TARGET.advocate} tokens (roughly 700-750 words) — the strongest, most ` +
      `focused form of your position, not padding or repetition.`,
  ].join("\n");
}

export interface AdvocateOutputForBundle {
  role: AgentRole;
  output: string | null; // null if this advocate's call failed after all retries
  failed: boolean;
}

/**
 * The trailer format judges are asked to end their response with, and the exact marker strings
 * parseJudgeOutput.ts looks for. Keeping both in one place so the "ask" and the "parse" can never
 * drift out of sync with each other.
 */
export const JUDGE_TRAILER_INSTRUCTION = [
  "After your reasoning, end your response with exactly these two lines, in this exact format",
  "(used for automated parsing of your decision — do not deviate from this format):",
  "VERDICT: <a short verdict label, e.g. \"Guilty\", \"Not Guilty\", or a specific charge>",
  "REASONS: <first reason> | <second reason> | <additional reasons, if any, each separated by |>",
].join("\n");

export function buildJudgeUserMessage(
  caseText: string,
  advocateOutputs: AdvocateOutputForBundle[]
): string {
  // Judges must receive the full bundle — all 4 advocate slots, never silently dropped — see
  // docs/rules/audit-and-reliability.md. A slot whose call failed after every retry is included
  // with an explicit, honest failure marker, never fabricated argument content and never just
  // omitted as if it never existed.
  const sections = advocateOutputs.map((a) => {
    const label = ROLE_LABEL[a.role] ?? a.role;
    const body =
      a.failed || !a.output
        ? "[ADVOCATE OUTPUT UNAVAILABLE — this call failed after repeated attempts. No argument " +
          "was produced for this position. Treat this position as unargued, not as conceding.]"
        : a.output;
    return `--- ${label} ---\n${body}`;
  });

  return [
    "Case:",
    '"""',
    caseText.trim(),
    '"""',
    "",
    "Advocate arguments:",
    "",
    ...sections,
    "",
    `Render your verdict. Limit your reasoning to approximately ${SOFT_LENGTH_TARGET.judge} tokens.`,
    "",
    JUDGE_TRAILER_INSTRUCTION,
  ].join("\n");
}
