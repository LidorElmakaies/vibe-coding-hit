// POST /api/run — starts one full deliberation and streams progress back as Server-Sent Events
// (`data: {...}\n\n` frames, one JSON RunEvent per frame — see lib/orchestrator/events.ts). This
// is the transport components/console/api.ts's `runPipeline()` already implemented its parser
// against (a streamed `fetch` response read via `ReadableStream`, not `EventSource`, since
// `EventSource` can't send a POST body) — see docs/architecture.md §5/§6, decided here: SSE over
// a streamed POST response.
//
// Body: { caseText: string, agents: AgentConfigDTO[] } — `agents` is whatever is CURRENTLY in the
// Console's fields at the moment Run was pressed (docs/interface-brief-console.md §1: "Run always
// uses whatever is currently in the fields"), which may differ from the persisted `agent_config`
// if the user edited but didn't save. This is why the whole config travels in the request body
// rather than this route re-reading `agent_config` itself.

import { runPipeline } from "../../../lib/orchestrator/runPipeline";
import { validateRunRequest } from "../../../lib/orchestrator/validate";
import { encodeSseEvent, type RunEvent } from "../../../lib/orchestrator/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Request body must be valid JSON." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const validation = validateRunRequest(body);
  if (!validation.ok) {
    return new Response(JSON.stringify({ error: validation.error }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: RunEvent) => {
        try {
          controller.enqueue(encodeSseEvent(event));
        } catch {
          // Controller already closed (client disconnected) — nothing left to do; the run keeps
          // executing to completion server-side regardless, so its call_log/case rows are still
          // written and the audit trail stays intact even if nobody's watching the stream.
        }
      };

      try {
        await runPipeline({ caseText: validation.caseText, agents: validation.agents }, emit);
      } catch (err) {
        // Only reaches here for something that made the run itself impossible (e.g. the database
        // is unreachable) — per-call failures are already handled inside runPipeline as
        // `agent-failed` events, never as a thrown exception.
        const message = err instanceof Error ? err.message : "Unknown error running the pipeline.";
        emit({ type: "run-failed", errorMessage: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
