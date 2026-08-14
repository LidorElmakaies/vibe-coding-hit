# Module 8 — Interface Design and App Documentation

> Source: `lessons/ASE26 lesson 5.pptx` (ASE-26, Lesson 5, 03.08.2026), slides 3–24 + the module
> description given in chat. The deck's own examples are drawn directly from our project — "the
> Tribunal," charge sheets, opinions, judge panels — confirming again this course *is* building
> agnet-project alongside us.

## 1. The Thread: Legibility

**Legibility** — a system readable and judgeable by someone who didn't build it — is a *control
mechanism*, not a comfort, in agentic engineering: an illegible interface can't be directed with
precision, an illegible codebase can't be reviewed, an illegible document can't be audited. The
human's ability to stay in the loop rests directly on how legible the agent's output is.

## 2. Design Is Specified, Not Drawn

You don't write the interface's code or draw its screen — you specify it, an agent produces it,
and you judge the result. **Taste moves from making to judging**: is the important thing prominent
and clear? Is the next action obvious to a stranger? (Donald Norman, *The Design of Everyday
Things*: a good design teaches its own use — the right action is obvious, the wrong one is hard,
and when a person struggles, the design is at fault, not the person.)

**Norman's two gulfs**, restated for direction rather than use:
- The **gulf of execution** — turning intent into action — is narrowed by what the design *asks*.
- The **gulf of evaluation** — reading what happened — is narrowed by what the design *shows and
  admits*.

Clarity is the actual standard (not polish): a stranger should read the interface without
instruction and know what to do next. It falls in three places — what it **shows**, what it
**asks**, what it **admits** (reveals about the true state) — and a specification is decisions
about exactly those three.

## 3. A Specification Has Four Parts

**"Build a good interface" tells the agent nothing — it fills the gap with a bland average.**
Four named decisions replace one vague impression, each checkable:

| Part | What it decides | The deck's own Tribunal example |
|---|---|---|
| **User flow** | The sequence of actions, *including the paths that go wrong* | What if the charge sheet is incomplete? What shows while the panel is deliberating? "Unnamed paths are where agents work worst." |
| **Information hierarchy** | What the user sees first | The verdict comes first; reasons follow; fuller arguments wait below. Show all three verdicts together, not buried — otherwise the disagreement between judges has to be pieced together by the reader. |
| **Interaction model** | How the user acts on it | The Tribunal needs only a form and a button. Agents tend to add controls no one asked for — "more controls merely look like more capability." Say plainly what interaction the task actually needs. |
| **Feedback design** | What the user sees while/after something happens — the part most often forgotten | Agents build the happy path and stop. Deliberately design the slow, failed, and empty states, not just success. |

**A failure must look like failure.** A loud breakdown can always be fixed; a silent one shows a
blank or a default — and a default rendered as if it were a real result *enters the record*. The
deck's own example: a malformed judge response must never silently read as "not guilty." Show
failure as failure, never as verdict.

**Design decays by addition, not by breakage.** One opinion on screen reads fine; add two more and
it crowds; add costs and timings and it crowds again — "nobody broke it; you only added to it." A
spec has to be revisited as new pieces get added, not written once and trusted forever.

**Right altitude:** say what's shown and in what order, and how the system behaves and speaks. Not
colors/pixels (too low), not "make it clean" (too high).

## 4. Documentation: Descriptive vs. Explanatory

**Document from the beginning, not the end** — reasons are clearest the moment a choice is made
and fade or get quietly revised afterward; a late record can never be complete.

- **Descriptive documentation** (the *what*) — names each part, its inputs/outputs. Agents write
  this well: the code is right in front of them. Check their account against the code.
- **Explanatory documentation** (the *why*) — rarely lives in the code; lives in the choices you
  made. **The agent cannot read your reasons, so left alone it invents them.** Only the human can
  supply the why.

**The agent knows the code, not the audience.** Ask for "documentation" and you get everything, in
no particular order, for nobody. Commission it instead as a **brief**: name the audience, the
purpose, the required sections, and the specific decisions the text must explain.

## 5. How This Applies to agnet-project — Deliverables and Rules Added

Per this module, the exercise is to produce two directing documents, not just discuss the theory:
- **[`docs/interface-brief-opinion-screen.md`](../interface-brief-opinion-screen.md)** — an
  interface brief for the results/opinion screen (the screen the deck itself uses as its running
  example).
- **[`docs/documentation-brief-backend-orchestrator.md`](../documentation-brief-backend-orchestrator.md)** —
  a documentation brief for the backend orchestrator component (the piece that runs the 7 calls
  and has the most "why" a future reader would need explained).

New rules folded into the reorganized rule set at [`docs/rules/interface-and-docs.md`](../rules/interface-and-docs.md)
(see [[CLAUDE.md]] §2 for the pointer — the flat rule list was split into topic files this pass
since it had grown past a dozen entries):

> Specify every screen with the four parts (flow incl. error paths / hierarchy / interaction /
> feedback) — never "make it look good." A model failure must render as a visible failure state,
> never as a silently-defaulted answer. Commission documentation as a brief (audience, purpose,
> sections, decisions to explain) — separate what the agent can write alone (descriptive) from
> what only we can supply (explanatory, the why). *(Module 8)*
