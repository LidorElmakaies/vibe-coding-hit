# Module 2 — The Human Role: What Erodes, What Compounds

> Source: `lessons/ASE26 lesson 2.pptx` (ASE-26, Lesson 2, 13/14.07.2026) + the module description
> given in chat. Covers slides 1–14 of that deck (slides 15–36 were blank/repeat in the source).

## 1. The Question and the Data

Anthropic's own research: developers use AI agents in **~60% of their work**, yet can **fully
hand off only a small share of tasks**. That's not a contradiction once "effective collaboration"
is read as **active human participation, not passive oversight** — closer to an editor paired with
a fast, tireless writer than a manager waiting for a report. Read the plan, watch it work, check
the result against a standard.

## 2. Three Kinds of Skill

The boundary isn't fixed — it moves as models improve — but right now:

| Bucket | What's in it | Why |
|---|---|---|
| **Erodes** | Writing a function to a precise spec; boilerplate (storage, test scaffolding, config); searching a whole codebase for a pattern; documenting behavior the code already shows | The more fully a task can be specified in advance, the more the agent can do it. Still worth knowing — it just stops being what sets you apart. |
| **Holds** | Debugging a first-of-its-kind failure; weighing a real trade-off between two good designs; knowing who must approve a change and how | The agent lacks either the context or the judgement — the block isn't "can it write code," it's missing context/judgement it has no way to acquire. |
| **Compounds** | Framing the problem; designing the system's overall shape; judging the quality of what the agent hands back; deciding what's worth building at all; taste (choosing the right design among ten) | Cheap production makes direction and judgement the scarce resource. This is where effort should go — it grows more valuable exactly as "erodes" shrinks. |

**Test for the boundary (Polanyi, *The Tacit Dimension*, 1966):** explicit knowledge is what can
be written down and taught from a book — an agent can absorb it from text, so it erodes. Tacit
knowledge is what you can't fully state even though you have it (recognizing a face, riding a
bike) — it doesn't transfer through text, so it holds or compounds. **The practical test: "could
this be taught completely from a book?"** If yes → erode. If no → hold/compound.

## 3. Four Hazards, Four Disciplines

Each hazard from working this way has a named discipline elsewhere in the course that answers it:

| Hazard | Answered by |
|---|---|
| Skill erosion | Deliberate practice (a personal habit, not a project rule) |
| Black-box codebase (nobody understands what shipped) | Review — **Module 16** |
| Responsibility gap (no one can say why a decision was made) | The audit trail — **Module 4** |
| Model bias (agent's framing quietly steers the outcome) | Framing & context — **Modules 6, 11** |

## 4. Accountability

**The human answers for the software, no matter what produced it.** Three duties are named as
non-delegable: **define "done," set the standard, approve the work.** A team that skips this ships
whatever the agent happened to produce and calls it a decision — accountability is framed as also
being the source of the human's *authority* over the process, not just a burden. "The market's
scarce skill is judgement, not typing."

## 5. The Self-Audit Exercise

The module closes with a personal exercise, not a project task: sort your own current habits into
erode/hold/compound, and notice where you've been investing effort in what's eroding fastest.
Worth doing individually — not something to encode into the project docs.

## 6. How This Applies to agnet-project — Concrete Rule Added

Unlike Module 1, this module produces an actual rule, not just framing. Added to
[[CLAUDE.md]] §2 Hard Rules:

> **Definition-of-done must be written by us, before delegating.** For every task handed to a
> sub-agent (frontend/backend/testing/devops, or an advocate/judge run), the acceptance criteria —
> what "correct" looks like — must be written by a human first. We do not let a sub-agent infer its
> own success bar and self-report "done."

Why this one earns a CLAUDE.md rule and Module 1's content didn't: Module 1 was framing/vocabulary;
this is a directly actionable accountability duty ("define done, set the standard, approve the
work") that changes how we're required to hand off work to `.claude/agents/*`.

Other mappings (context, not new rules — will likely become rules once the referenced future
module lands):
- Where we put our own effort building agnet-project should skew toward the "compounds" bucket:
  designing the advocate/judge pipeline, judging whether an agent's output is actually a good
  argument, deciding what's in/out of scope — not toward hand-writing boilerplate the agent
  already does well.
- "Black-box codebase → review" foreshadows the testing/review discipline `docs/agents/testing.md`
  will need (full treatment expected at Module 16).
- "Responsibility gap → audit trail" foreshadows a logging/record requirement for our pipeline runs
  (expected at Module 4 — likely lands as a concrete rule almost immediately, see
  `docs/modules/module3-mental-models-of-agents.md` for what arrived alongside this lesson).
