# Cost & Token Budget — agnet-project

> Resolves the "exact hard-cap value for calls-per-deliberation" open item from
> [Module 9](modules/module9-cognified-software-and-agent-economics.md) (see
> [`docs/rules/cost-and-performance.md`](rules/cost-and-performance.md)). Pencil draft like the
> rest of `docs/` — the real numbers here are **budgets/caps we're setting**, not measurements of
> an actual run, since we don't have the teacher's real system prompts yet (see `CLAUDE.md` §6)
> and case length varies per submission.

## 1. Why This Is a Budget, Not a Measurement (read this before trusting any number below)

Module 9's own "~17,000 tokens" figure for the Tribunal is the course's illustrative number for a
*typical* run — it wasn't derived from our actual 7 system prompts (unwritten by us, unreceived
from the teacher) or an actual submitted case (length varies by user). Until a real run happens,
every number here is a **cap we're choosing to enforce**, not a fact we've observed. Once real
runs exist, this doc should be revisited with actual measured numbers — that's a
[Module 10](modules/module10-specification-and-co-evolution-spiral.md) commit point, not yet
reached.

## 2. Per-Agent Token Budget

> **2026-08-17 update:** the `max_tokens` values below are now the **seeded defaults** in the
> `agent_config` table, editable per agent via the Admin/Run Console
> ([ADR-0014](decisions/0014-editable-agent-config-admin-console.md)) — they're no longer
> hardcoded constants in code. The reasoning behind the specific numbers (below) still applies;
> editability is a UI convenience for the console's user, not a repeal of the blast-radius
> reasoning in §5.

Output length is controlled by **two different mechanisms working together**, decided
2026-08-14:

1. **A soft instruction, in the user message we construct** — e.g. "...here is the case. Limit
   your answer to approximately N tokens." This lives in the bundle *we* build (the case + any
   operational instructions), never in the teacher's system prompt — see §2a below for why that
   boundary matters. It's a request, not a guarantee: a model can still exceed it.
2. **A hard `max_tokens` cap on the OpenRouter call** — enforced by the API itself, not a request.
   Set a little above the soft instruction, so it only ever bites if a model ignores the hint,
   rather than being the thing that normally truncates output.

| Call | Input budget | Soft instruction (in the user message) | Hard `max_tokens` | Why this split |
|---|---|---|---|---|
| **Each advocate** (×4) | ≤ 2,000 tokens (teacher's system prompt, budgeted ≤ 800, + the submitted case, budgeted ≤ 1,000, + overhead) | **~1,000 tokens** | **1,300** | A focused, "strongest form of the argument" case — facts cited, one clear theory, a conclusion — genuinely fits in 500–750 words (~650–1,000 tokens). More room than that tends to invite padding and repetition rather than a stronger argument, which is the opposite of what the budget is for. |
| **Each judge** (×3) | ≤ 4,500 tokens (judge system prompt ≤ 800, + case ≤ 1,000, + all 4 advocate outputs at ≤ 1,000 each = ≤ 4,000, + overhead — see below) | **~500 tokens** | **700** | A verdict is checkable ("a verdict plus at least two reasons," per [Module 10](modules/module10-specification-and-co-evolution-spiral.md)'s testable-criteria example) — it should be short and structured, not prose. This is also a direct, mechanical defense against the named failure "a judge may return prose": a tight budget makes rambling harder, though it doesn't replace actually checking the shape (see [`docs/rules/audit-and-reliability.md`](rules/audit-and-reliability.md)). |

*(Judge input budget rose from the original sketch since advocate output itself rose from 600 to
1,000 tokens — each judge reads all 4 advocate outputs, so a judge's input budget tracks the
advocate output cap directly: ≤4,000 for the four arguments, not ≤2,400.)*

### 2a. Why the soft instruction doesn't break the never-edit-system-prompts rule

[[CLAUDE.md]] §2 is explicit: none of the 7 teacher-provided system prompts get edited, ever. The
soft length instruction doesn't touch them — it lives in the **user message** (the case/bundle
content), which is ours to construct regardless. The `system` role carries the teacher's prompt
verbatim; the `user` role carries the case plus whatever operational instructions we add on top.
Worth naming as a real, if minor, tension: if a teacher's prompt pushes an advocate toward
thoroughness, our length instruction pulls the other way — the two aren't necessarily in harmony,
and that's an accepted tradeoff in favor of cost/legibility, not an oversight.

## 3. Total Expected Tokens Per Run

| | Input | Output (soft target) | Output (hard ceiling) |
|---|---|---|---|
| 4 advocates | ≤ 8,000 | 4,000 | ≤ 5,200 |
| 3 judges | ≤ 13,500 | 1,500 | ≤ 2,100 |
| **Total** | **≤ 21,500** | **5,500 (expected)** | **≤ 7,300 (worst case)** |

The **5,500-token output figure** is what should actually happen in practice, since it's what the
soft instructions ask for. The **≤7,300 worst case** only gets hit if every single call ignores its
soft instruction and runs all the way to its hard cap — unlikely across all 7 calls at once, but
that's exactly what a *ceiling* has to assume.

Combined with input, that puts a full run at roughly **21,500–28,800 tokens**, depending on how
close output lands to the soft target vs. the hard ceiling — in the same range as Module 9's own
~17,000-token *typical*-case figure, on the higher side because this is a budget (worst-case-aware)
rather than an average.

**With prompt caching** ([ADR-0007](decisions/0007-parallel-calls-and-prompt-caching.md)) on the
shared case text: implemented 2026-08-18 in `lib/orchestrator/bundle.ts`/`callAgent.ts` (see §7
below for the real, live-verified specifics) — the case (for advocates) / case+all-4-advocate-
outputs (for judges) is marked cacheable via OpenRouter's `cache_control` extension. **Read §7
before assuming this reliably means "billed once instead of up to 7 times" in practice** — that
framing turned out to only reliably hold for calls that don't race each other; the 4 advocates (and
separately the 3 judges) are deliberately dispatched in true parallel per this same ADR, and live
testing showed parallel sibling calls typically each write their own cache entry rather than one
writing and the others reading it, so the within-stage saving is less than the original wording
implied. It's still real cost savings, just not this exact framing — see §7.

## 7. Prompt Caching — Real, Verified Behavior (added 2026-08-18)

Implemented per OpenRouter's actual documented request format (verified against their docs, not
guessed): the cacheable prefix is sent as its own content block with `cache_control: {"type":
"ephemeral"}`, using the content-blocks-array form of a message's `content` instead of a plain
string (`lib/orchestrator/bundle.ts`'s `buildAdvocateUserMessage`/`buildJudgeUserMessage`, sent via
`lib/orchestrator/callAgent.ts`). What's cacheable per call type:

- **Advocates (×4):** the case text — identical across all 4 calls.
- **Judges (×3):** the case text **+ all 4 advocate outputs** (the full bundle) — identical across
  all 3 calls.

The soft length instruction (and, for judges, the verdict trailer-format instruction) is always a
second, *uncached* block after the cacheable one.

**Live-verified findings (real OpenRouter calls, 2026-08-18, not just a read of the docs):**

1. **The mechanism itself works correctly when the routed provider supports it.** A controlled,
   sequential (not parallel) test against `anthropic/claude-sonnet-4.5` showed an explicit cache
   *write* on the first call (`cache_write_tokens: 3195`) and a cache *hit* on an identical second
   call a few seconds later (`cached_tokens: 3195`, cost for that call dropping roughly 11x). This
   is direct proof the request format is correct, not just plausible-looking.
2. **It's a genuine no-op, not an error, for a provider/routing that doesn't support it.** A full
   real run in "single model for all" mode using `anthropic/claude-3-haiku` completed all 7 calls
   successfully with `cached_tokens: 0` / `cache_write_tokens: 0` throughout — no errors, no
   special-casing needed, exactly the harmless-no-op behavior this was designed for. (Separately:
   forcing that model's provider routing to `anthropic` directly returned "No endpoints found" —
   this specific legacy model id may no longer route to Anthropic's own caching-capable endpoint by
   default on OpenRouter. Not a caching bug; flagged for whoever revisits `CURATED_MODELS`.)
3. **Real, not-previously-identified tension: parallel dispatch (this same ADR-0007) races the
   cache write.** A real run where all 3 judges (identical cacheable bundle, same model) were
   dispatched via `Promise.all` — exactly as ADR-0007 requires — showed **all three** calls with
   `cache_write_tokens > 0` and `cached_tokens: 0`: each one wrote its own cache entry instead of
   one writing and the other two reading it. The cache write evidently isn't visible to sibling
   requests that reach the provider within the same short window. So "the case is cached once and
   reused across the 4 advocates / 3 judges within a single run" is **not** reliably true for
   same-stage siblings specifically — the parallelization this project deliberately chose for
   latency (~6s vs ~21s, ADR-0007) works against same-run cache reuse within a stage. What caching
   *does* still reliably help with: a provider that supports it billing the cached block's *reuse*
   whenever a later, non-simultaneous call (a retry, a different run of a similar/identical case
   within the cache TTL, or any call that lands meaningfully after an earlier one's write has
   propagated) hits the same model. This is a real, if narrower, saving than the original
   documentation implied — corrected here rather than left overclaimed.
4. **Scoped per model+provider, as documented.** In "random per agent" mode (`lib/constants.ts`'s
   `CURATED_MODELS`, picked independently per role), cross-call cache reuse mostly won't fire since
   sibling calls usually land on different models — an accepted, inherent tradeoff of that mode,
   not a bug (see the comment in `lib/orchestrator/callAgent.ts`).

No provider-specific branching was added — the same block structure is sent unconditionally
regardless of which model/provider ends up handling the call, per OpenRouter's own guidance that
providers without support simply ignore the field.

## 4. Estimated Cost Per Run

**These prices are illustrative placeholders, not live OpenRouter pricing** — real per-token
prices vary by model and change over time, and no model has been chosen yet (open item, `CLAUDE.md`
§6). The method matters more than the numbers until that's picked:

> cost per run ≈ Σ over 7 calls of (input tokens × input price) + (output tokens × output price)

| Model tier (illustrative only) | Example price (per 1M tokens, in/out) | Cost at the ≤28,800-token worst case |
|---|---|---|
| Small/cheap tier | ~$0.15 in / ~$0.60 out (example) | ≈ $0.004–0.005 per run |
| Frontier tier | ~$3 in / ~$15 out (example) | ≈ $0.07–0.10 per run |

Even at the frontier-tier example price, a single run costs cents, not dollars — the real risk this
budget guards against isn't one expensive run, it's an **unbounded number of runs or retries** (see
§5). Once a model is chosen, replace the example prices with OpenRouter's actual listed price for
that model and recompute.

## 5. The Blast-Radius Cap (resolves the open item)

A single deliberation is fixed at 7 calls by design ([[CLAUDE.md]] §2) — the real runaway-cost risk
is **retries**, not the base 7. Setting the cap here:

- **Each call may retry up to 2 times on failure** (3 attempts total) before that call is marked
  failed in the audit trail — per
  [`docs/rules/audit-and-reliability.md`](rules/audit-and-reliability.md)'s "never let a failure
  pass through silently" rule, a failed call after 3 attempts renders as a visible failure, not
  another silent retry.
- **A single run's hard ceiling is 21 OpenRouter calls** (7 base × up to 3 attempts each). A run
  that would exceed this aborts entirely and logs a failure — this is the actual number for the
  "exact hard-cap value for calls-per-deliberation" item in `CLAUDE.md` §6.

## 6. New Requirement: Total Tokens Used, Calculated Every Run

Every run must calculate and persist **the total tokens used across all 7 (or more, with retries)
calls**, sourced from OpenRouter's own response data (each completion response includes a `usage`
object — `prompt_tokens`, `completion_tokens`, `total_tokens` — no extra API call needed, just sum
what's already returned). This is now part of the project's actual goal, not only a nice-to-have:

- **Per-call**: already required by the audit trail (`call_log` row per call, see
  [`docs/architecture.md`](architecture.md) §3) — token counts per call were already in scope.
- **Per-run (new)**: the *sum* across the run's calls must be computed and stored against the
  `case` — e.g. a `total_tokens` value derived from `SUM(call_log.tokens) WHERE case_id = ...`, or
  a stored column updated as each call completes. Either is fine; what's not fine is a total that
  isn't actually derived from real OpenRouter `usage` data.
- **This should be genuinely checkable, not decorative** — the testing agent's job includes
  confirming the displayed/stored total actually equals the sum of the real per-call values, not a
  placeholder or an estimate.

See [`docs/framing.md`](framing.md) §3 (definition of done, item 7) and
[`docs/interface-brief-opinion-screen.md`](interface-brief-opinion-screen.md) for where this
surfaces to a reader.
