# Module 4 — Anatomy of an Agentic Workflow: From Coding to Engineering

> Source: `lessons/ASE26 lesson 3.pptx` (ASE-26, Lesson 3, 21.07.2026), slides 4–13 + the module
> description given in chat.

## 1. The Seven Parts

| Part | What it is | Deck's framing |
|---|---|---|
| **Intent** | What the work truly tries to achieve — the reason it exists at all | "Add validation" states a *solution*, not an intent. The real intent is catching bad input early. The request's surface form hides its own purpose. |
| **Specification** | Translates intent into precise, checkable decisions | Which inputs count as bad? Does the function return or raise? Every decision fixed here is one the agent won't have to guess. Thin specs get filled in with hidden assumptions. |
| **Context** | The surrounding information the agent needs | Project conventions, related existing code, the established error pattern to follow. The agent can't see a pattern nobody supplied — missing context produces work that's wrong *in place* (fits nowhere). |
| **Plan** | Divides the work into ordered steps | Makes the agent's understanding visible early. Reading it catches misunderstanding at the lowest possible cost — a wrong sentence is cheap to fix; the same error surfacing after many files change is not. |
| **Execution** | The agent actually doing the work | Looks like "the whole" to outsiders, and is where the agent spends most of its effort — but the deck's point is the real skill lives in everything *around* it, not in this step itself. |
| **Verification** | Checks the output against the written specification | Confirms each bad-input case is actually rejected; confirms existing callers still behave. The agent's speed is exactly what makes this most necessary *and* most tempting to skip. |
| **Audit trail** | Records decisions, actions, and verification applied | Lets someone return months later and understand what happened and why. Much of it is a natural byproduct of the other six — but it's the easiest of all to lose, and it's what most sharply separates engineering from craft. |

## 2. The Line That Matters: Engineering vs. Craft

> "A workflow that cannot be inspected, replayed, or judged after the fact is not engineering,
> it is craft."

Engineering is accountable and reproducible. Craft produces a result and leaves no account of how.
An output with no trace of its making **cannot be improved, cannot be audited, and cannot be
trusted past the moment it ran.** The audit trail is what rescues a workflow from being mere
craft: a frozen record linking **intent → specification → context → the agent's trajectory →
final output.** That chain of links is the actual difference between engineering and "sophisticated
guesswork" — not the tools used, not how good the model is.

## 3. Why This Module Comes Early

This seven-part shape is the map for most of the rest of the course — each later module is a
close study of one stage: Module 6 → intent, Module 10 → specification, Module 11 → context,
Module 13 → verification, Modules 14–15 → the cases where one agent isn't enough and execution
must spread across several. Seeing the whole shape first is what's meant to keep those later,
deeper modules coherent instead of feeling like unrelated topics.

## 4. How This Applies to agnet-project — Concrete Rules Added

This module directly delivers on something **Module 2 flagged and left open**: the "responsibility
gap" hazard was named there as answered by "the audit trail — Module 4." It has now landed. Added
to [[CLAUDE.md]] §2 Hard Rules:

> **Every pipeline run needs an audit trail.** Each run of the courtroom pipeline (4 advocate
> calls + 3 judge calls) must produce a frozen record linking: the intent behind that run, the
> specification/system-prompt used, the context handed in (case text + bundle), the agent's
> actual output, and what verification (if any) was applied to it. Not optional, and not
> satisfied by "it printed to the console" — the record has to survive after the run ends.
> Implementation TBD once the backend stack is chosen (see Open Questions); until then, treat
> "how do we log/persist this" as a required design question for whichever agent builds the
> backend, not an afterthought.

> **Distinguish intent from specification when writing each agent's system prompt.** Per this
> module's Intent/Specification split: don't let "argue the defendant is innocent" (a
> solution-shaped instruction) stand in for the actual intent (e.g. *why* that agent exists — to
> stress-test a specific line of defense so the judges see the strongest version of it). Write
> the intent, then derive a specification (precise, checkable expectations for that agent's
> output) from it — don't skip straight from a one-line stance to a system prompt. Extends the
> Module 2 definition-of-done rule with this vocabulary. *(Modules 2, 4)*

Other direct mappings (context, not new rules):
- **Plan** (§1) reinforces the Module 3 rule about reading a sub-agent's plan against the actual
  task rather than its tone — this module adds the reasoning why: catching a misunderstanding in
  the plan is the cheapest place to catch it, before files change.
- **Verification** (§1) is the module that most directly names what our (not-yet-built) testing
  agent exists to do — "the agent's speed makes this check most necessary and most tempting to
  skip" is the argument for building it rather than skipping it under time pressure.
