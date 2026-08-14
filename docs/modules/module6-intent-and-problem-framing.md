# Module 6 — Intent and the Discipline of Problem Framing

> Source: `lessons/ASE26 lesson 4.pptx` (ASE-26, Lesson 4, 27.07.2026), slides 5–27 + the module
> description given in chat. **This is where the course says the real build begins** (see
> [module1](module1-what-is-agentic-software-engineering.md) §1).

## 1. The Core Claim

**Most failed agentic work fails before any agent is ever called** — the problem was framed badly
or not framed at all. The agent receives a thin instruction, makes confident guesses, and builds
something coherent that nobody wanted. Two worked failures make the case:
- A fitness app that never decided if it was about training or eating, so both went in — "nothing
  is broken; the app simply has no center."
- A student planner that quietly assumed employers post shifts early and teachers space out
  deadlines — neither was true. "Nothing is broken; the people it relied on were never counted."

**Both were built competently. Both were still useless.** The fault was upstream, in the thinking,
not in the making — which is why **problem framing is the first and most consequential thing a
human contributes to any agentic workflow.**

## 2. The Problem Is Found, Not Given

Three thinkers, three fields, one conclusion: the problem is not handed to you ready-made — finding
it *is* the work.
- **George Pólya** (*How to Solve It*, 1945): set a whole stage — "understand the problem" —
  before any attempt at a solution. "To solve a problem that is not yet understood is only to
  solve the wrong one faster."
- **Donald Schön** (*The Reflective Practitioner*, 1983): experts don't take the problem as given —
  they reframe it as they engage with it. Constant reframing isn't a sign of poor prep; "it is the
  mark of expertise itself." Novices work the problem as stated; experts keep finding the real one.
- **Frederick Brooks** (*The Design of Design*, 2010, recounting building his own house): his
  architect proposed a pavilion; only when the family rejected it did they discover what they
  actually wanted (one central room, keeping the old oak tree). **The requirement was found by
  first proposing the wrong one.**

Consequence: **your first project plan is a first draft, written in pencil, never a contract.**
You can't think your way to a perfect concept up front — you put up something concrete and
imperfect, read what's wrong with it, and let it correct you. (Module 10 turns this into a working
rhythm: the co-evolution spiral.)

## 3. Three Questions Before Any Deliverable

1. **WHAT is it for** — the single purpose that justifies the whole thing. Uncomfortable because
   it makes the project defend its own existence. Clear purpose gives a thousand smaller decisions
   a criterion; missing purpose leaves every decision to taste or argument.
2. **SHOULD IT EXIST at all** — the hardest form of the question, and sometimes the honest answer
   is no. Nothing outside the project will ask this for you.
3. **WHO is it for** (the user model) — every design is for someone, named or not. State it
   plainly, even at risk of being wrong: "it is better to be wrong than vague, because only a
   wrong model can be put right."
4. **What CONSTRAINTS am I working inside** — naming constraints narrows the design; *questioning*
   assumed constraints (e.g. "does it even need to be a phone app?") often widens it back out.

## 4. Four Written Deliverables

Framing isn't only thinking — it leaves four artifacts on paper, each revisable, each what you
return to when a decision is disputed. **"A plan that produces nothing on paper leaves nothing to
judge against."**

| Artifact | Definition | Test for a good one |
|---|---|---|
| **Problem statement** | Describes the *situation that needs to change*, not the solution | "Could someone propose several different solutions to it?" If only one solution fits, you wrote the solution, not the problem. (e.g. "Build a planner that shows classes and shifts in a grid" = a solution. "A working student keeps losing study time to a week that will not hold still" = a problem.) |
| **Stakeholder list** | Names everyone with a stake: who uses it, maintains it, approves it, is affected by it | "Nobody should ever discover themselves on the list too late." A stakeholder left off is an interest you meet only at the moment you violate it. |
| **Definition of done** | States what must be true for the work to count as finished, checkably | "Could two people reading the result still disagree about whether it was met?" If yes, it's a hope, not a definition of done. |
| **Out-of-scope list** | Names what the project will deliberately not do | An entry only belongs if someone could reasonably have *expected* it in scope. ("It will not compose music" belongs on no list — nobody expected that anyway.) |

## 5. The Reverse Interview (a technique, not a rule)

Once framing is drafted, the agent finally appears — not to build, but to interrogate: give it a
short sketch (a paragraph or two) and have it interview you one focused question at a time,
pressing on every vague answer rather than accepting it politely. It should surface six things:
what the project is fundamentally for; who precisely uses it; how anyone would know it worked;
what's being left out; which constraints shape the solution space; what someone could observe to
prove it's done. **The real prize at the end: ask it for the list of every assumption it had to
make where you said nothing** — that list is a map of the silences in your own thinking, each one
now a decision to make on purpose.

## 6. How This Applies to agnet-project — Deliverable Produced

Per this module, framing is meant to be *produced*, not just discussed. A first-draft framing
document for agnet-project has been written to **[`docs/framing.md`](../framing.md)** — the four
artifacts above, filled in as a pencil draft per §2's own advice (expect to revise it as building
teaches us more, not treated as a contract). See that file for the actual problem statement,
stakeholder list, definition of done, and out-of-scope list.

New rule added to [[CLAUDE.md]] §2 Hard Rules:

> **Keep a written framing document, and revise it — don't treat it as a one-time step.**
> `docs/framing.md` (problem statement, stakeholder list, definition of done, out-of-scope list)
> is the thing decisions get checked against when disputed. Update it when reality corrects it;
> don't let it go stale while the build moves on without it. *(Module 6)*

Open item this module surfaces directly: **§5's "reverse interview" is a technique worth actually
running** once the framing draft exists, to find assumption-gaps before committing to
`docs/architecture.md` decisions. Not done yet — flagged here so it isn't lost.
