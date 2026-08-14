# Module 9 — Cognified Software and the Economics of a Model Call

> Source: `lessons/ASE26 lesson 5.pptx` (ASE-26, Lesson 5, 03.08.2026), slides 26–46 + the module
> description given in chat. **The deck states outright: "The Tribunal is cognified software"** —
> this module is about agnet-project specifically, not a generic example.

## 1. Using AI to Build vs. Building With AI Inside

Most of the course is about the first (directing agents to build software). This module is about
the second: **products where the model's intelligence is part of what the user is paying for**,
not just part of how it was made. Kevin Kelly (*The Inevitable*, 2016) named this force
"cognifying" — making ordinary things smart with cognition, the way electrification once made
ordinary things powered.

**The model is a runtime component, not a build-time tool.** It runs every time the software is
used, present for every user, always — no prewritten code can substitute for that call. For
agnet-project: the advocates and judges argue, judge, and give reasons using models *at request
time* — "no fixed rules produce these verdicts... each answer is made in the moment."

## 2. The Four Facts (why this needs its own engineering questions)

Ordinary code is deterministic and (nearly) free/instant. A model call is none of those:

| Fact | Consequence |
|---|---|
| **Variable** | The same charge sheet given to a judge twice may rest the verdict on different grounds, or even flip on a hard case. "This is the component's nature, not a bug" — **you cannot test for one fixed answer.** |
| **Costly** | Billed per token, both read and written. |
| **Slow** | A capable model takes several seconds; sequential calls add up. |
| **Fallible** | Fails by producing a *fluent, confident* error — not a crash. |

**Draw the boundary well.** A cognified system isn't model-throughout — most of the Tribunal is
plain code (storing, carrying, arranging); the model appears only where actual reasoning is
required. Reaching for the model where plain code would do "costs you dearly."

## 3. Three Questions to Answer on Purpose (not by agent default)

An agent will answer these with whatever's most common in its training data — rarely what the
product actually needs:
1. **Where does the model run?** Network (largest/least-private) vs. on-device (most private,
   smallest). Shapes cost, speed, trust.
2. **How is it prompted?** "Behaviour lives in the prompts, not the code" — the judges reason
   *because of* their prompts. A careless prompt edit is a real fault. **Treat prompts as code:
   versioned and reviewed.**
3. **What happens when it's wrong?** Check the shape of the response before trusting it; retry or
   fall back; make the failure visible, never a result. The subtler danger is the *fluent* failure
   — a well-formed answer resting on absent facts, which a format check can't catch; only reading
   the content will. (Directly extends [Module 8](module8-interface-design-and-documentation.md)'s
   "a failure must look like failure.")

## 4. Agent Economics — With Real Numbers

- **Every call has a price**: tokens read + written, times the price for that model. Cost sums
  across every call in a system.
- **For our exact shape:** one full deliberation is **7 calls, not 1** — each judge reads all 4
  advocate outputs, so judges cost the most. **A full case spends roughly 17,000 tokens**, most of
  it on the judges. **Cost grows faster than the agent count** — worth remembering before adding a
  5th advocate or a 4th judge casually.
- **Prompt caching**: much of each prompt repeats across calls — all 7 agents read the same charge
  sheet. Caching stores the repeated part once and reuses it, charged once instead of 7 times. "A
  large shared prompt saves the most" — directly applicable, since our charge sheet is exactly
  that shared block.
- **The biggest lever is model choice**, not micro-optimization — models span a wide price range;
  ask what's *good enough* for each call. "A hard ruling may warrant a capable model. A one-sided
  argument may need far less." **Cost is architecture, not accounting** — 7 frontier-model calls
  may be too expensive for a system meant to run often; one deliberation is cheap, ten thousand are
  not.
- **Latency**: a capable model takes several seconds; sequential calls add those seconds together
  ("seconds are ordinary here, not a fault" — the latency budget is what you can tolerate waiting).
  **Run in parallel whatever doesn't depend on anything else**: the 4 advocates don't depend on
  each other — call them at once. The judges must wait for all 4 advocates first, but the 3 judges
  don't depend on each other either. **The deck's own numbers for our exact shape: 7 calls run
  fully sequentially take ~21 seconds; run well (parallelized within each stage), the same work
  takes ~6 seconds.**
- **Economic blast radius**: a loop can spend faster than anyone is watching — set a hard limit on
  calls per deliberation, capping what a single run may spend. (Extends the blast-radius concept
  from [Module 3](module3-mental-models-of-agents.md)/[Module 5](module5-ade-typology.md) from
  "harm from a mistaken action" to "harm from unbounded spend.")

## 5. How This Applies to agnet-project — Rules Added

The rule list was reorganized into topic files this pass (see [[CLAUDE.md]] §2) since it had grown
past a dozen flat entries; this module's rules landed in
[`docs/rules/cost-and-performance.md`](../rules/cost-and-performance.md) (new file) and extended
[`docs/rules/audit-and-reliability.md`](../rules/audit-and-reliability.md) and
[`docs/rules/agent-design.md`](../rules/agent-design.md):

> Run the 4 advocate calls in parallel; run the 3 judge calls in parallel once all 4 advocate
> outputs exist — don't serialize what doesn't depend on anything. Use prompt caching for the
> shared charge sheet across all 7 calls. Set a hard cap on calls-per-deliberation to bound
> economic blast radius (exact number: open, see `CLAUDE.md` §6). Match each model's capability to
> that call's actual difficulty rather than defaulting one model everywhere. Treat every system
> prompt as code: versioned and reviewed, never edited carelessly. A model failure (malformed or
> fluently-wrong) must never silently pass through as a real advocate/judge output — check it,
> retry/fall back, and if it still fails, show the failure as a failure. *(Module 9)*

`docs/architecture.md` §2 (request cycle diagram) and §5 (open questions) were updated to reflect
the parallel-execution shape and the concrete ~17k-token / ~6s figures — see that file.

## 6. Open Follow-ups From This Module

- [ ] Exact hard-cap value for calls-per-deliberation — not yet decided.
- [ ] Whether to actually vary model choice across the 7 calls (cheaper for advocates, more
      capable for judges) or keep one shared model for simplicity's sake, given "keep the stack
      minimal" — a real tension worth resolving deliberately, not by default. Track in `CLAUDE.md` §6.
