# Project Framing — agnet-project

> Produced per [Module 6](modules/module6-intent-and-problem-framing.md)'s four deliverables.
> **This is a pencil draft** — per that module, a first framing is meant to be imperfect and get
> corrected as building teaches us more, not treated as a contract. Revise this file in place when
> something here turns out wrong; don't let it go stale.

## 1. Problem Statement

*(Describes the situation, not the solution — test: could several different solutions address
this?)*

A single, unstructured query to an LLM about a criminal case tends to produce a shallow,
one-sided take — it settles on whatever reading feels most likely rather than surfacing the
strongest version of each side. A real verdict is only trustworthy once it's clear the strongest
form of both the defense's and the prosecution's case was actually considered, not just the
median or most-agreeable answer a single model call happens to produce. There is currently no way
to see, or verify, that a set of AI agents arguing a legal case actually explored genuinely
distinct positions rather than converging into near-duplicate arguments — and no independent,
auditable way to check that judges ruling on the case saw the full, unfiltered set of arguments
before ruling.

*(Multiple solutions could address this: different numbers of advocates, different prompting
strategies to force distinct positions, structured-output schemas instead of free text, single
vs. multiple judge models, human-in-the-loop review instead of pure agent judging, etc. — the
2-defense/2-prosecution/3-judge shape below is the specific solution the teacher assigned, not
the only possible one, which is what keeps this a real problem statement rather than a restated
solution.)*

## 2. Stakeholder List

*(Everyone with a stake — used to catch a dependency before it's violated, not after.)*

| Stakeholder | Stake |
|---|---|
| **The student (user)** | Builds it, is graded on the process (per [Module 1](modules/module1-what-is-agentic-software-engineering.md)'s grading rule: "I grade how well you direct the agent"), owns all decisions and accountability per [Module 2](modules/module2-the-human-role.md). |
| **The teacher** | Supplies the case input **and all 7 system prompts** (4 advocates + 3 judges — updated 2026-08-14; originally assumed we'd write the 4 advocate prompts ourselves, corrected by the user); grades the repo (documentation + running project + engagement, per the course's grading breakdown); is the actual approver of "done." |
| **The 4 advocate agents (as design artifacts)** | Not people, but each has a "stake" in being run correctly — since the prompts themselves are the teacher's authorship, our responsibility shifts to *not corrupting* them (never editing, always passing the full case) rather than designing them (see [Module 4](modules/module4-anatomy-of-agentic-workflow.md)'s intent/specification distinction, now applied to our orchestration code instead). |
| **A future reader of the audit trail** | Anyone (grader, the student later, a reviewer) who opens the record of a past run — per [Module 4](modules/module4-anatomy-of-agentic-workflow.md), needs to understand what happened and why without having watched it happen. |
| **Whoever runs the app end-to-end** | **Confirmed:** this project is the course's own "Tribunal" — a reusable web app, not a one-off script. Someone submits a charge sheet (defendant, act, exact question) and reads back an opinion; past cases can be browsed. Nearly missed the way [Module 6](modules/module6-intent-and-problem-framing.md)'s planner example missed the employer/teachers — worth naming explicitly now that it's caught. |

## 3. Definition of Done

*(Checkable — test: could two people looking at the result still disagree whether it was met?)*

A run is "done" when, for the teacher-supplied case:
1. All 4 advocate agents have produced a single-shot output using their teacher-provided system
   prompt, arguing their assigned stance (defense/prosecution). Whether the 2 defense / 2
   prosecution prompts embody genuinely distinct strategies is the teacher's authorship, not ours
   to fix — but a run should still surface it clearly if two outputs read as near-duplicates.
2. All 3 judge agents (teacher's prompts, unmodified) have each independently received the full
   bundle (case + all 4 advocate outputs) and produced a verdict.
3. Every one of those 7 calls has a persisted audit-trail record: which model, the prompt/context
   used, the output, and (for judges) which verification if any was applied — satisfying the
   [Module 4](modules/module4-anatomy-of-agentic-workflow.md) / [Module 7](modules/module7-web-application-architecture.md) audit-trail rule.
4. A human (the student) can point to where each of the 7 outputs is stored/displayed and re-read
   it after the run ends — not just watched it scroll by once.
5. No OpenRouter key or system prompt is ever exposed to anything untrusted (browser, logs shipped
   externally, etc.) — per the [Module 7](modules/module7-web-application-architecture.md) secrets rule.
6. A charge sheet (case) can be submitted through a browser form, and the resulting opinion is
   shown back and stored so it can be found again later from a past-cases list — per the confirmed
   Tribunal scope (§4).

*(Not yet fully checkable, pending open items: exact judge-prompt wording — see Open Questions in
[CLAUDE.md](../CLAUDE.md) §6.)*

## 4. Out-of-Scope List

*(Only entries someone could reasonably have expected — not an exhaustive "everything else.")*

- **Multi-turn debate between advocates, or between advocates and judges.** All 7 calls are
  single-shot by design (see [[CLAUDE.md]] §2) — this project deliberately does not build a
  back-and-forth courtroom simulation.
- **Editing or generating any of the 7 system prompts** (4 advocates + 3 judges). All come from
  the teacher verbatim, never authored or tuned by us.
- **A general-purpose legal-advice tool.** This is a class exercise, not a product aimed at real
  legal use — the app being reusable across cases (see below) doesn't make it one.
- **Fine-tuning or training a model.** All agents are prompt-driven calls through OpenRouter to
  existing models — no model training is in scope.
- **User accounts, auth, or multi-user access control.** The Tribunal-scope confirmation (§2) adds
  a reusable web app with a past-cases list, but not login/permissions — single-user/no-auth is
  assumed unless stated otherwise.

**No longer out of scope (confirmed):** a multi-case "past cases" browsing UI / general reusable
web app in the shape of [Module 7](modules/module7-web-application-architecture.md)'s "Tribunal"
example — this project *is* that app, not a one-off script over a single fixed case. See
[`docs/architecture.md`](architecture.md) for what that implies for the browser/database.

## 5. Still Open

See [CLAUDE.md](../CLAUDE.md) §6 for the full list. Still open: the case input and all 7 system
prompts themselves (blocked on the teacher). The Tribunal-scope question is resolved — see §2 and
§4 above.
