// One logical agent call (advocate or judge), with the retry/attempt loop, live streaming, and
// the per-attempt call_log audit row. This is the one place that actually talks to OpenRouter.
//
// Reliability contract (docs/rules/audit-and-reliability.md): a model failure must never look
// like a real result. Every attempt is validated for shape (non-empty text + a genuine `usage`
// object with numeric token counts) before being accepted as a success; anything else retries, up
// to MAX_ATTEMPTS_PER_CALL, and only renders as `agent-failed` — never a blank/defaulted output —
// once attempts are exhausted.

import { getOpenRouterClient } from "../openrouter/client";
import { insertCallLog } from "../db/queries";
import { MAX_ATTEMPTS_PER_CALL, type AgentRole } from "../constants";
import { flattenUserMessageBlocks, type UserMessageBlock } from "./bundle";
import type { RunEvent } from "./events";

const CALL_TIMEOUT_MS = 60_000;

export interface CallAgentParams {
  caseId: string;
  role: AgentRole;
  callType: "advocate" | "judge";
  model: string;
  systemPrompt: string;
  userMessage: UserMessageBlock[];
  maxTokens: number; // already clamped to the hard cap by the caller
  emit: (event: RunEvent) => void;
  /** Bumped by the caller across the whole run; returns false if the 21-call ceiling is hit. */
  reserveCallSlot: () => boolean;
}

export interface CallAgentResult {
  success: boolean;
  output: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  costUsd: number | null;
  errorMessage: string | null;
}

interface AttemptOutcome {
  ok: boolean;
  output: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  costUsd: number | null;
  errorMessage: string | null;
}

async function runOneAttempt(params: CallAgentParams, streamLiveToClient: boolean): Promise<AttemptOutcome> {
  const client = getOpenRouterClient();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

  let buffer = "";
  let usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; cost?: number } | null =
    null;

  try {
    // `usage: { include: true }` and the user message's `cache_control` blocks are both
    // OpenRouter-specific extensions not part of the official OpenAI schema (the `openai` SDK's
    // own content-part type has no `cache_control` field) — hence the loose cast on the request
    // body, kept as narrow as possible (params.userMessage is still a real, typed
    // UserMessageBlock[] up to this point — see lib/orchestrator/bundle.ts).
    //
    // Prompt caching (ADR-0007, docs/cost-budget.md, docs/rules/cost-and-performance.md) is scoped
    // PER MODEL+PROVIDER on OpenRouter's side — a cached block only gets reused by a later call
    // that hits the same model/provider. In "single model for all" mode (all 7 calls use the same
    // model) this is a real, working optimization: the case text is cached across the 4 advocate
    // calls, and the case+all-4-outputs bundle is cached across the 3 judge calls. In "random per
    // agent" mode, each call likely lands on a different model, so cross-call cache hits mostly
    // won't happen — that is an accepted, inherent tradeoff of that mode (you're trading cache
    // reuse for model diversity), NOT a bug in this code; don't "fix" it by special-casing model
    // selection here. We also don't branch on provider: OpenAI/Gemini 2.5+ cache automatically
    // regardless of this field (a harmless no-op for them), Anthropic/older-Gemini/Alibaba need
    // the explicit marker to activate it, and providers with no caching support just ignore the
    // field — the same request shape is sent unconditionally either way. Also inherently
    // best-effort on short input: providers that honor `cache_control` generally only actually
    // cache a block above a provider-specific minimum size (roughly 1,024+ tokens) — a short case
    // simply won't be cached, which is expected, not a failure.
    const stream = await client.chat.completions.create(
      {
        model: params.model,
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userMessage },
        ],
        max_tokens: params.maxTokens,
        stream: true,
        stream_options: { include_usage: true },
        usage: { include: true },
      } as unknown as Parameters<typeof client.chat.completions.create>[0],
      { signal: controller.signal }
    );

    // TS can't narrow the stream/non-stream overload through the `as unknown` cast above; assert
    // the async-iterable shape we know `stream: true` produces.
    for await (const chunk of stream as AsyncIterable<{
      choices: Array<{ delta?: { content?: string | null } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; cost?: number } | null;
    }>) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        buffer += delta;
        if (streamLiveToClient) {
          params.emit({ type: "agent-delta", role: params.role, textDelta: delta });
        }
      }
      if (chunk.usage) usage = chunk.usage;
    }
  } catch (err) {
    clearTimeout(timeout);
    const message = err instanceof Error ? err.message : "Unknown error calling OpenRouter.";
    return {
      ok: false,
      output: buffer,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      costUsd: null,
      errorMessage: message,
    };
  }
  clearTimeout(timeout);

  // Shape validation — never let a malformed/empty response pass as a real result. See
  // docs/rules/audit-and-reliability.md's named anti-pattern.
  const text = buffer.trim();
  const hasUsage =
    usage !== null &&
    typeof usage.prompt_tokens === "number" &&
    typeof usage.completion_tokens === "number" &&
    typeof usage.total_tokens === "number";

  if (!text) {
    return {
      ok: false,
      output: buffer,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      costUsd: null,
      errorMessage: "Model returned an empty response.",
    };
  }
  if (!hasUsage) {
    return {
      ok: false,
      output: buffer,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      costUsd: null,
      errorMessage: "OpenRouter response did not include usable token-usage data.",
    };
  }

  return {
    ok: true,
    output: text,
    promptTokens: usage!.prompt_tokens ?? null,
    completionTokens: usage!.completion_tokens ?? null,
    totalTokens: usage!.total_tokens ?? null,
    // OpenRouter's cost-accounting extension; not every model/provider on OpenRouter returns it,
    // so treated as best-effort (unlike token counts, which are required for a call to count as a
    // success — see docs/cost-budget.md §6's "genuine sum" requirement, which is about tokens).
    costUsd: typeof usage!.cost === "number" ? usage!.cost : null,
    errorMessage: null,
  };
}

export async function callAgent(params: CallAgentParams): Promise<CallAgentResult> {
  params.emit({ type: "agent-status", role: params.role, status: "running" });

  let lastError = "Call was never attempted.";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_CALL; attempt++) {
    if (!params.reserveCallSlot()) {
      lastError = "Run aborted: the 21-call-per-run budget was exhausted before this call could run.";
      break;
    }

    const startedAt = new Date();
    // Only the very first attempt streams live token deltas to the client — a retried attempt
    // starts writing into the same panel a prior failed attempt already partially wrote to, and
    // there is no clean way to tell the browser "discard what you've shown so far" with the
    // current event contract (see this agent's status report: flagged as a known, accepted, purely
    // cosmetic gap — `agent-done`/`agent-failed` always carry the true final value regardless).
    const outcome = await runOneAttempt(params, attempt === 1);
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();

    await insertCallLog({
      caseId: params.caseId,
      role: params.role,
      callType: params.callType,
      attemptNumber: attempt,
      model: params.model,
      systemPrompt: params.systemPrompt,
      maxTokens: params.maxTokens,
      // `call_log.userMessage` is a plain TEXT column — flattened back from the block array
      // actually sent (see lib/orchestrator/bundle.ts's flattenUserMessageBlocks doc comment: the
      // blocks are constructed so this reconstructs the exact same text the pre-caching
      // single-string version produced, just reporting content, not the caching framing).
      userMessage: flattenUserMessageBlocks(params.userMessage),
      status: outcome.ok ? "success" : "failed",
      // On failure, still log whatever partial text (if any) had streamed in before the error —
      // useful for debugging a malformed/truncated response — as null rather than an empty string
      // when nothing came through at all.
      output: outcome.output.length > 0 ? outcome.output : null,
      errorMessage: outcome.errorMessage,
      promptTokens: outcome.promptTokens,
      completionTokens: outcome.completionTokens,
      totalTokens: outcome.totalTokens,
      costUsd: outcome.costUsd,
      durationMs,
      startedAt,
      finishedAt,
    });

    if (outcome.ok) {
      // Emitting `agent-done` (with any judge-specific verdict/reasons enrichment) is the
      // caller's job — see runPipeline.ts — so this function stays agnostic to advocate-vs-judge
      // response shape.
      return {
        success: true,
        output: outcome.output,
        promptTokens: outcome.promptTokens,
        completionTokens: outcome.completionTokens,
        totalTokens: outcome.totalTokens,
        costUsd: outcome.costUsd,
        errorMessage: null,
      };
    }

    lastError = outcome.errorMessage ?? "Unknown failure.";
  }

  // `agent-failed` is also left to the caller (runPipeline.ts emits it), purely so both terminal
  // events for a role are emitted from one place and can't drift apart.
  return {
    success: false,
    output: null,
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
    costUsd: null,
    errorMessage: lastError,
  };
}
