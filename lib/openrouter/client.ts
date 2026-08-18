// Raw `openai` SDK pointed at OpenRouter's base URL — no LangChain, a deliberate written decision,
// see ADR-0010 (docs/decisions/0010-raw-sdk-not-langchain.md). This is the ONLY place
// OPENROUTER_API_KEY is read. It never gets logged, returned in a response body, or passed to the
// browser in any form — see docs/rules/security-and-permissions.md.

import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenRouterClient(): OpenAI {
  if (client) return client;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Copy .env.example to .env (local) or set it in the " +
        "deployment environment. This key must never be exposed to the browser — see " +
        "docs/rules/security-and-permissions.md."
    );
  }

  client = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      // Optional, non-secret identification headers OpenRouter's docs recommend — purely for
      // OpenRouter's own analytics/rankings, not required for calls to succeed.
      "X-Title": "The Tribunal (agnet-project)",
    },
  });
  return client;
}
