// Client-side API layer for the Console.
//
// Contract confirmed directly with the backend agent (2026-08-17) — no longer a guess. Nothing
// here ever holds the OpenRouter key or invents prompt text — prompt text only ever flows in from
// what the backend's own response contains.

import type { AgentConfigDTO, AgentRole, ModelId, PastRunDetail, PastRunSummary } from "./types";

const AGENT_CONFIG_URL = "/api/agent-config";
const RUN_URL = "/api/run";
const CASES_URL = "/api/cases";
const MODELS_URL = "/api/models";

export async function fetchAgentConfigs(): Promise<AgentConfigDTO[]> {
  const res = await fetch(AGENT_CONFIG_URL);
  if (!res.ok) throw new Error(`GET ${AGENT_CONFIG_URL} failed: ${res.status}`);
  const data = await res.json();
  return data.agents as AgentConfigDTO[];
}

/**
 * The curated model list for the model-selection dropdown — a flat array of OpenRouter model ids
 * (confirmed against app/api/models/route.ts). Never falls back to a hardcoded list on failure:
 * callers must show a genuine "models unavailable" state rather than silently offering a
 * stale/invented set of options.
 */
export async function fetchModels(): Promise<ModelId[]> {
  const res = await fetch(MODELS_URL);
  if (!res.ok) throw new Error(`GET ${MODELS_URL} failed: ${res.status}`);
  const data = await res.json();
  return data.models as ModelId[];
}

/**
 * PUT returns the saved config, which may differ from what was sent — e.g. `maxTokens` gets
 * server-clamped to the hard cap (1300 advocates / 700 judges). Callers must apply the returned
 * value back onto local state rather than trusting the value they sent, or an edit that got
 * clamped server-side would silently keep showing the un-clamped number until the next page load.
 */
export async function saveAgentConfig(
  role: AgentRole,
  patch: Partial<Omit<AgentConfigDTO, "role">>
): Promise<AgentConfigDTO> {
  const res = await fetch(`${AGENT_CONFIG_URL}/${role}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PUT ${AGENT_CONFIG_URL}/${role} failed: ${res.status}`);
  return (await res.json()) as AgentConfigDTO;
}

export async function fetchPastRuns(): Promise<PastRunSummary[]> {
  const res = await fetch(CASES_URL);
  if (!res.ok) throw new Error(`GET ${CASES_URL} failed: ${res.status}`);
  const data = await res.json();
  return data.cases as PastRunSummary[];
}

export async function fetchPastRunDetail(id: string): Promise<PastRunDetail> {
  const res = await fetch(`${CASES_URL}/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`GET ${CASES_URL}/${id} failed: ${res.status}`);
  return (await res.json()) as PastRunDetail;
}

// One event from the run's SSE stream. Confirmed with backend (2026-08-17): `judgeResult` on
// `agent-done` is parsed server-side from a fixed trailer format ("VERDICT: ... / REASONS: a | b
// | c") in the judge's own output, and is simply OMITTED — never guessed or defaulted — if a
// judge doesn't comply with that format. `output` (the raw text) is always present regardless, as
// a fallback. Renderers must handle `judgeResult` being absent on an otherwise-successful
// `agent-done` for a judge role — see VerdictsSummary's fallback card for that case.
export type RunEvent =
  | { type: "agent-status"; role: AgentRole; status: "running" }
  | { type: "agent-delta"; role: AgentRole; textDelta: string }
  | {
      type: "agent-done";
      role: AgentRole;
      output: string;
      judgeResult?: { verdict: string; reasons: string[] };
    }
  | { type: "agent-failed"; role: AgentRole; errorMessage: string }
  | { type: "summary"; totalCostUsd: number; totalTokens: number; totalTimeMs: number }
  | { type: "run-done" }
  | { type: "run-failed"; errorMessage: string };

/**
 * Starts a run and streams events back. POST + a streamed `text/event-stream` response read via
 * `fetch`'s `ReadableStream` (not `EventSource`, since `EventSource` can't send a POST body).
 * Transport confirmed with backend: SSE framing (`data: {...}\n\n`).
 *
 * `agents` is exactly what's currently in the config fields at the moment Run is pressed, already
 * excluding any slot the caller has locally decided to block (e.g. an empty judge system prompt)
 * — see app/page.tsx's pre-run validation. Confirmed 2026-08-17: this matches backend's actual
 * `{caseText, agents}` body — an earlier relayed version said caseText-only, corrected before any
 * code depended on it.
 *
 * A `run-failed` event can arrive mid-stream (not just as a request-level rejection) — callers
 * must flip any still-running/not-yet-started panel to a failed state on that event, not only on a
 * thrown request error. See app/page.tsx's `markUnfinishedAsFailed`.
 */
export async function runPipeline(
  caseText: string,
  agents: AgentConfigDTO[],
  onEvent: (event: RunEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(RUN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caseText, agents }),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`POST ${RUN_URL} failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sepIndex: number;
    while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
      const rawFrame = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);
      const dataLine = rawFrame.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      const jsonText = dataLine.slice("data:".length).trim();
      try {
        const event = JSON.parse(jsonText) as RunEvent;
        onEvent(event);
      } catch {
        // A malformed frame must never be silently dropped or treated as a real event — surface
        // it as a run-level failure, per the audit-and-reliability "never let a failure pass
        // through silently" rule.
        onEvent({
          type: "run-failed",
          errorMessage: "Received a malformed event from the server.",
        });
      }
    }
  }
}
