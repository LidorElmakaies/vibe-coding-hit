# Module 10 — Specification and the Co-Evolution Spiral

> Source: `lessons/ASE26 lesson 6.pptx` (ASE-26, Lesson 6), slides 4–31 + the module description
> given in chat. Its own example warnings — "a judge may return prose," "a charge sheet may lack
> its question" — are our project's exact failure modes, again.

## 1. The Specification Is the Human's Deliverable

**In agentic engineering the code is the agent's output; the specification is the human's.** Not
a feature list — a precise document that gives the agent enough to make its own decisions
*correctly*, so the human doesn't have to step in at every turn. **Treat the specification as the
primary product, kept and versioned after the code exists** — to raise output quality, raise
specification quality and regenerate, rather than patching code directly. The agent can draft most
of the writing and answer its own questions, but **every judgement call stays ours; read the whole
document before approving it, and own every mistake approved.**

## 2. Knuth's Five Criteria (the formal target prose aims at)

Donald Knuth's 1968 criteria for an algorithm, used here as a benchmark a natural-language spec
should aim at without fully reaching: **finiteness** (ends after finite steps), **definiteness**
(every step defined without ambiguity), **input/output** (both named precisely), **effectiveness**
(a person could follow it with paper). Write as prose, one sentence per decision the agent faces —
state the judgement wanted, not the steps to get there.

## 3. Five Parts, Written Before Building

| Part | What it answers | Gap if skipped |
|---|---|---|
| **1. Goal & its reason** | What to build, *and why* — the reason settles forks the spec didn't foresee | Leave out the reason and the agent can satisfy the letter while betraying the intent |
| **2. Testable success criteria** | Stated so a second reader could confirm it at a glance — "well reasoned" replaced by something countable (e.g. *a verdict plus at least two reasons*); arithmetic-style checks first, reference-measured checks (e.g. "within 5% of a known count") where arithmetic won't do | Leave this out and the agent stops when the code *runs*, not when it *works* |
| **3. Architectural guidance** | Boundaries only, a few sentences — name what must stay fixed (e.g. "reach the models through the existing client"), leave file/function choices to the agent | Leave it out and the agent picks something structurally fine and contextually wrong |
| **4. Validation approach** | Name the concrete test/review/control case *before* building, and build toward it | Without a named check, nothing but code-runs confirms anything |
| **5. Known pitfalls** | The warnings a colleague would give — written once, permanently, because the agent only raises them once told. **The deck's own examples: "a judge may return prose," "a model call may time out," "a charge sheet may lack its question."** | Skipped pitfalls get rediscovered at cost, repeatedly |

**The reverse interview** (technique, reused from [Module 6](module6-intent-and-problem-framing.md)):
give the agent a short sketch, have it interview you until it could write the spec itself — its
questions land exactly where your sketch went quiet.

## 4. A Specification Is Never Final — the Co-Evolution Spiral

Requirements emerge from attempted solutions; the first spec is the opening turn of a spiral, not
a contract (Boehm 1988; Cross & Dorst 2001, "Co-Evolution of Problem–Solution"; Brooks: build,
observe, revise). **The stakes are real** — the deck anchors this with Lufthansa Flight 2904: the
braking system followed a spec that described a normal landing correctly and reality wrongly, and
people died.

**One turn of the spiral:** revise intent from what the last turn taught → update context so the
lesson survives → commit the current state, branch → have the agent build, verify against the
written criteria → review and record the evidence.

Two judgment skills the deck says are **taught nowhere else in the course**:
- **The commit point** — deciding, at each turn's end, what to lock. **Lock what use confirmed,
  not what argument confirmed.** Leave contested points open; hold scope and purpose fixed as you
  loop; require a milestone from every turn.
- **Drift detection** — reading when the spiral is failing (going in circles rather than
  converging).

## 5. How This Applies to agnet-project — Rules Added

Extended [`docs/rules/agent-design.md`](../rules/agent-design.md) with a **Specification
Structure** section: every future spec we hand to a sub-agent (the backend-orchestrator brief, any
frontend/testing/devops task — not the advocate/judge prompts, which are teacher-provided, see
`CLAUDE.md` §2) should hit Knuth's criteria in prose and cover all five parts above — goal+reason,
testable criteria, architectural boundaries, validation approach, pitfalls. This is now the
concrete shape the existing "definition-of-done starts from intent" rule (Modules 2, 4) should
take.

Applied the **commit point / drift detection** discipline to our own living docs: `docs/framing.md`
and `docs/architecture.md` are marked "pencil draft, revise freely" with no notion of what's
actually locked. Going forward, treat a section as **committed** only once a real run has
confirmed it (not just once it sounds right in discussion) — mark such sections explicitly rather
than leaving everything permanently soft. Not retrofitted onto the existing files yet since
nothing has actually run — revisit once the first real deliberation executes.

## 6. Open Follow-ups From This Module

- [ ] Once the backend exists and a first case runs end-to-end, do a first commit-point pass on
      `docs/framing.md`/`docs/architecture.md` — lock what that run actually confirmed.
- [ ] Write the backend-orchestrator brief as a full 5-part spec before handing it to a build
      agent (the advocate/judge prompts themselves don't need this — they're teacher-provided,
      see `CLAUDE.md` §2).
