# Architecture — agnet-project

> First-draft architecture, applying [Module 7](modules/module7-web-application-architecture.md)'s
> four-part model (browser / backend / database / deployment) to this project. **Pencil draft**
> per [Module 6](modules/module6-intent-and-problem-framing.md) — expect this to change once stack
> decisions land. This project is confirmed to be the course's own "Tribunal": a reusable web app
> over any submitted case, not a one-off script over a single fixed case — see
> [`docs/framing.md`](framing.md) §2/§4. See [`CLAUDE.md`](../CLAUDE.md) for the rules this must
> satisfy.

## 1. The Four Parts, Applied Here

| Part | Role in agnet-project |
|---|---|
| **Browser** | A submission form (charge sheet: defendant, act, exact question) creates a new case; a results view shows the 4 advocate outputs + 3 verdicts once a run completes; a past-cases list lets a case be found and re-read later. Untrusted by design — see §4. |
| **Backend** | Orchestrates all 7 agent calls: builds each advocate's bundle (case + its system prompt), builds each judge's bundle (case + all 4 advocate outputs + judge system prompt), calls OpenRouter for each, writes results. Holds the OpenRouter key and all 7 system prompts — never sent to the browser. |
| **Database** | Persists every submitted case, its 4 advocate outputs, its 3 verdicts, and a call-log row per model call (model, output, tokens, cost, time) — the audit trail required by [[CLAUDE.md]] §2. Also what makes the past-cases list possible. |
| **Deployment** | Not yet decided — see Open Questions. |

## 2. Request Cycle — One Full Run

```
Browser                      Backend                              Database
   │                             │                                    │
   │  user submits a charge sheet (defendant, act, exact question)    │
   │────────────────────────────>│                                    │
   │                             │──> write case ────────────────────>│
   │                             │
   │                             │──> call Advocate #1 (defense,  strategy A)  ┐
   │                             │──> call Advocate #2 (defense,  strategy B)  │ all 4 IN PARALLEL
   │                             │──> call Advocate #3 (prosecution, theory C) │ (no dependency
   │                             │──> call Advocate #4 (prosecution, theory D) ┘  between them)
   │                             │      single-shot, no shared context — see [[CLAUDE.md]] §2
   │                             │──> write each output + call-log row ─────────────────────────>│
   │                             │
   │                             │──> build bundle = case + all 4 outputs   (waits for all 4)
   │                             │──> call Judge #1 (teacher prompt)  ┐
   │                             │──> call Judge #2 (teacher prompt)  │ all 3 IN PARALLEL
   │                             │──> call Judge #3 (teacher prompt)  ┘ (no cross-talk)
   │                             │──> write each verdict + call-log row ────────────────────────>│
   │                             │
   │<────────── 4 outputs + 3 verdicts ─────────────────────────│
   │  (rendered for the student to read; also retrievable later via the past-cases list)
```

7 OpenRouter calls total per run (4 advocates + 3 judges), ~17,000 tokens for a full deliberation
per [Module 9](modules/module9-cognified-software-and-agent-economics.md) — judges cost the most
since each reads all 4 advocate outputs. Each call is single-shot — no conversation state carried
between calls (see `CLAUDE.md` §2). **Two stages, each parallelized internally**: the 4 advocates
run at once (nothing between them to wait on), then the 3 judges run at once once all 4 advocate
outputs exist. Per Module 9's own figures for this exact shape: fully sequential ≈ 21s; run this
way ≈ 6s. The charge sheet is identical across all 7 calls — use prompt caching on it (see
[`docs/rules/cost-and-performance.md`](rules/cost-and-performance.md)). A hard cap on
calls-per-deliberation bounds the cost of a runaway run — see Open Questions for the exact number.

## 3. Database Shape (sketch, not yet a schema)

Per [Module 7](modules/module7-web-application-architecture.md) §5, the choice between SQL and
NoSQL is explicitly deferred ("know that both exist, the choice can wait") — sketching the shape
in neutral terms:

- **case** — the submitted charge sheet text (defendant, act, exact question) + metadata (when
  submitted).
- **advocate_output** (×4 per run) — stance (defense/prosecution), strategy label, system prompt
  used, model used, output text.
- **verdict** (×3 per run) — judge id, system prompt used (teacher's, verbatim), model used,
  output text.
- **call_log** (×7 per run) — one row per OpenRouter call: which of the above it belongs to,
  model, token counts, cost, timestamp. This *is* the audit trail — see
  [[CLAUDE.md]] §2's audit-trail rule.

## 4. Trust Boundary (Module 7 rule, restated concretely here)

- The OpenRouter API key lives only in backend config/environment — never shipped to the browser,
  never in client-side JS, never committed to the repo in plaintext.
- All 7 system prompts (ours for the 4 advocates, the teacher's for the 3 judges) live only on the
  backend. The browser only ever receives finished text to display.
- The teacher's judge prompts are stored verbatim, unedited — see [[CLAUDE.md]] §2.

## 5. Open Questions (carried from CLAUDE.md §6, architecture-relevant subset)

- [ ] Backend language/runtime — not decided.
- [ ] SQL vs. NoSQL — deliberately deferred, per Module 7 itself.
- [ ] Deployment target — not decided (Netlify was listed as a course-recommended default; not
      confirmed for this project).
- [ ] Which OpenRouter model(s) — per [Module 9](modules/module9-cognified-software-and-agent-economics.md),
      match capability to each call's difficulty rather than defaulting one model everywhere; exact
      choice not made yet.
- [ ] Exact hard-cap value for calls-per-deliberation (economic blast radius, Module 9) — not decided.
