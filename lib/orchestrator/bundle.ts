// Builds each call's USER message. Per docs/cost-budget.md §2a / docs/rules/security-and-
// permissions.md: the `system` role always carries whatever prompt is currently configured for
// that agent verbatim (teacher's default, or a Console user's edit) — we never touch it. The
// `user` role is ours to construct: the case text plus our own operational instructions (a soft
// length target, and — for judges only — a fixed trailer format we ask for so the verdict/reasons
// can be parsed without guessing at freeform prose). Neither instruction is prompt content; both
// are the kind of "here's the case, and here's how to format your answer" wrapper this project's
// rules explicitly reserve for the user message.
//
// Returns an array of content blocks, not a plain string — this is what makes prompt caching
// (ADR-0007, docs/cost-budget.md, docs/rules/cost-and-performance.md) possible: OpenRouter's
// caching mechanism (verified against OpenRouter's own docs, 2026-08-18) works by marking a
// `cache_control: {"type": "ephemeral"}` block on the specific content block you want the
// provider to reuse across calls, using the content-blocks-array form of `content` instead of a
// plain string. See lib/openrouter/client.ts / lib/orchestrator/callAgent.ts for where these
// blocks actually get sent.

import { SOFT_LENGTH_TARGET, type AgentRole } from "../constants";

const ROLE_LABEL: Record<string, string> = {
  "defense-1": "Defense Advocate #1",
  "defense-2": "Defense Advocate #2",
  "prosecution-1": "Prosecution Advocate #1",
  "prosecution-2": "Prosecution Advocate #2",
};

/**
 * One block of a user message's `content` array. `cache_control` is an OpenRouter-specific
 * extension (not part of the official OpenAI content-part schema — the `openai` SDK's own
 * `ChatCompletionContentPartText` type has no such field), so this is our own type, not the SDK's
 * — see lib/orchestrator/callAgent.ts for the narrow cast where it actually gets sent.
 */
export interface UserMessageBlock {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
}

/**
 * Flattens a user message's blocks back into one string, in order — used only for the `call_log`
 * audit row's `userMessage` field (a plain TEXT column; the request actually sent to OpenRouter
 * uses the block array above, not this flattened form). Each builder below is written so its
 * blocks concatenate back into exactly the same text the pre-caching single-string version
 * produced — caching changed how the content is *framed* for the request, not what it *says*.
 */
export function flattenUserMessageBlocks(blocks: UserMessageBlock[]): string {
  return blocks.map((b) => b.text).join("");
}

// docs/cost-budget.md's minimum-useful-size caveat: providers that support explicit caching
// (Anthropic, older Gemini, Alibaba — per OpenRouter's docs) generally only actually cache a block
// above a provider-specific minimum token count (roughly 1,024+ depending on provider/model). A
// very short case text falling under that threshold is a real, expected case where caching is
// simply inert — not a bug, and not something this code tries to detect or route around; sending
// the marker is harmless either way (see the file-level comment on provider behavior below).
export function buildAdvocateUserMessage(caseText: string): UserMessageBlock[] {
  const cacheableCase: UserMessageBlock = {
    type: "text",
    text: ["Case:", '"""', caseText.trim(), '"""'].join("\n"),
    cache_control: { type: "ephemeral" },
  };
  const instruction: UserMessageBlock = {
    type: "text",
    text:
      "\n\n" +
      `Respond with your argument for this case. Limit your answer to approximately ` +
      `${SOFT_LENGTH_TARGET.advocate} tokens (roughly 700-750 words) — the strongest, most ` +
      `focused form of your position, not padding or repetition.`,
  };
  return [cacheableCase, instruction];
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

/**
 * Judges: the case text + all 4 advocate outputs are identical across all 3 judge calls (the same
 * bundle plugged into each) — that whole combined block is what's marked cacheable. The
 * render-verdict soft-length instruction and the trailer-format instruction go in a second,
 * uncached block after it.
 */
export function buildJudgeUserMessage(
  caseText: string,
  advocateOutputs: AdvocateOutputForBundle[]
): UserMessageBlock[] {
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

  const cacheableBundle: UserMessageBlock = {
    type: "text",
    text: ["Case:", '"""', caseText.trim(), '"""', "", "Advocate arguments:", "", ...sections].join("\n"),
    cache_control: { type: "ephemeral" },
  };
  const instruction: UserMessageBlock = {
    type: "text",
    text:
      "\n" +
      [
        "",
        `Render your verdict. Limit your reasoning to approximately ${SOFT_LENGTH_TARGET.judge} tokens.`,
        "",
        JUDGE_TRAILER_INSTRUCTION,
      ].join("\n"),
  };

  return [cacheableBundle, instruction];
}
