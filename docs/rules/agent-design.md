# Rules — Agent Design & Delegation

> Part of the split-out rule set — see [`CLAUDE.md`](../../CLAUDE.md) §2 for the pointer and
> [`docs/framing.md`](../framing.md)/[`docs/architecture.md`](../architecture.md) for how these
> apply concretely. Project-defining constraints (single-shot advocates, distinct strategies,
> judges get the full bundle, judge prompts unedited) stay in `CLAUDE.md` §2 itself since they're
> the assignment's own shape, not module-derived discipline — this file holds the *how we direct
> and delegate* rules the course has added on top.

- **Definition-of-done must be written by us, before delegating — starting from intent, not a
  solution-shaped request.** Every task handed to a sub-agent (frontend/backend/testing/devops, or
  an advocate/judge run) needs a human-written intent (why this exists) and a specification
  (precise, checkable decisions) derived from it, before the agent acts. A sub-agent never gets to
  infer its own success bar and self-report "done." *(Modules 2, 4)*

- **Anti-sycophancy by design wherever an agent judges or checks something.** Applies to the 3
  judges and the future testing agent: push toward finding what's wrong, not confirming what was
  handed to them looks fine. *(Module 3)*

- **No agent grades its own work.** Verification of an agent's output must come from a genuinely
  separate agent/process — never the same agent self-certifying. Already true structurally
  (judges are separate from advocates); extends explicitly to our own build: the testing agent
  must be independent from whichever agent produced what it's checking. *(Module 5)*

- **Treat every system prompt as code: versioned and reviewed, never edited carelessly.**
  "Behaviour lives in the prompts, not the code" — a careless prompt edit is a real fault, not a
  copy tweak. Applies to our 4 advocate prompts (the teacher's 3 judge prompts are already fixed
  and unedited by rule). *(Module 9)*

- **Match each model's capability to that call's actual difficulty — on purpose, not by default.**
  "A hard ruling may warrant a capable model. A one-sided argument may need far less." Don't
  default one shared model everywhere without deciding that deliberately — see the open question
  on this in `CLAUDE.md` §6. *(Module 9)*

## Specification Structure (Module 10)

Every spec we hand to a sub-agent — the 4 advocate system prompts, the backend-orchestrator brief,
any frontend/testing/devops task — should be written in prose but hit **Knuth's criteria**: finite
(ends after finite steps), definite (every step unambiguous), input/output named precisely,
effective (a person could follow it with paper). Concretely, cover all **five parts**, in this
order:

1. **Goal & its reason** — what to build, and *why*, so the reason (not just the letter) settles
   forks the spec didn't foresee.
2. **Testable success criteria** — checkable by a second reader at a glance; prefer arithmetic-
   style checks ("X equals Y summed") before softer reference-measured ones.
3. **Architectural guidance** — boundaries only, a few sentences; leave implementation choices to
   the agent.
4. **Validation approach** — name the concrete test/check *before* building, and build toward it.
5. **Known pitfalls** — the warnings a colleague would give, written once, permanently (our own
   named example: "a judge may return prose" — write the rule, not just note the risk).

This is the concrete shape the definition-of-done rule above should take — not a replacement for
it. See [Module 10](../modules/module10-specification-and-co-evolution-spiral.md) for the full
reasoning, including the co-evolution spiral (a spec is never final) and its two judgment skills:
**commit points** (lock what a real run confirmed, not what argument confirmed) and **drift
detection** (notice when revision is circling instead of converging).
