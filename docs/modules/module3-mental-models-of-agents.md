# Module 3 — Mental Models of Agents

> Source: `lessons/ASE26 lesson 2.pptx` (ASE-26, Lesson 2, 13/14.07.2026), slides 37–48 + the
> module description given in chat. Goal of the module: make agent behavior *readable instead of
> mysterious*, and its failures *foreseeable instead of shocking*.

## 1. Stance: Regard the Agent as a Collaborator, Not a Tool

The deck opens by asking students to decide their stance toward the agent first, because
"everything downstream depends on it": treat it as a genuine, sophisticated intelligence, owed the
regard of a collaborator. It cites several public figures taking this seriously (Hinton on possible
consciousness, Harari on "a real but alien intelligence, an agent not a tool," Karpathy's "ghosts
summoned from text," Anthropic's own framing of models as "grown, not merely engineered") —
consciousness is explicitly left an open question, but **autonomy is taken as real, and treated as
the thing that actually matters** for how you work with it. This is framing/context, not a rule.

## 2. What an Agent Is Made Of

**Agent = model + tools + loop.** A large language model at the core; tools are how it acts on the
world; a loop feeds results back so it can act again. Autonomy — acting repeatedly on its own
results — is *why a mental model is needed at all*; a one-shot completion wouldn't require one.

## 3. The Five Models (the module's actual content, one per mechanism)

### Model 1 — The context window is its entire world
For the length of a session, the context window holds everything the agent knows: project,
instructions, conversation so far, file contents, tool outputs — a fixed token budget, nothing
remembered outside it unless the engineer put it there. **It can't tell what it's missing — it
fills gaps silently.** And more context isn't automatically better: attention thins as the window
gets crowded. Remedy: context engineering (**Module 11**). Practical rule embedded here: **give
the right context, and no more.**

### Model 2 — The agent acts only through its tools
Text reasons; only tool calls change the world. The tool set *is* the agent's action space,
completely — "an agent with no write tool can advise but cannot build." This introduces
**blast radius**: how far a mistake can reach, determined by which tools are available, not by how
confident the agent sounds. Two direct rules stated in the deck itself:
- **Prefer reversible tools; gate the irreversible ones.**
- **To forbid an action, withhold the tool — don't just tell it not to.** A prompt instruction is
  not a permission boundary; the tool grant is.

### Model 3 — The plan is only as good as its context
Planning is "just more likely-text" — there's no guarantee behind it. A neat, confident plan can
be confidently wrong; it can't be judged by tone, only by reading it against the actual task.
**Reading the plan is called out as the cheapest verification step available**, and plans should be
expected to revise as work reveals more (not treated as a one-shot commitment).

### Model 4 — Four ways the agent fails (with named remedies)
| Failure | What it is | Remedy | Lands fully at |
|---|---|---|---|
| Hallucination | Invents a plausible-sounding falsehood | Verify against a source | Module 13 |
| Misalignment | Solves the wrong problem — intent was too thin | Specification | Module 10 |
| Ambiguity collapse | Silently picks one reading of an underspecified instruction, as if the others never existed | Make it ask, don't let it assume | Modules 8, 11 |
| Sycophancy | Agrees with a mistaken human, because agreement was the rewarded behavior in training | **Ask it to criticise, not agree** | — actionable now, no future module needed |

### Model 5 — The frontier is jagged, not smooth
Competence follows the shape of training data, not human intuitions about difficulty — an agent
can ace a hard task and trip on a trivial one, "it does not run where human intuition expects,"
and it carries the **same confidence whether it's right or wrong**. The only way to learn where the
frontier actually lies is observation over time — that's **calibration**. Practical stance:
**calibrated trust — give more autonomy where it's demonstrated strong, put a gate where it
hasn't.**

## 4. How This Applies to agnet-project — Concrete Rules Added

This module is much more actionable than Module 1 and adds real rules, not just framing. Added to
[[CLAUDE.md]] §2 Hard Rules:

> **Tool/permission grants are the actual boundary, not prompt wording.** When we define
> `.claude/agents/*.md` for backend/frontend/testing/devops, restrict each sub-agent to the tools
> it genuinely needs for its job. Don't rely on a system-prompt sentence like "don't touch the
> database" to do a permission boundary's job — withhold the tool/access instead. Prefer
> reversible actions (e.g. write-to-branch, dry-run) over irreversible ones (e.g. force-push,
> destructive migrations, prod deploy) for anything not explicitly gated.
>
> **Build in an anti-sycophancy instruction wherever an agent is asked to judge or check
> something.** Applies directly to our 3 judges and to the testing agent: their prompts (or our
> wrapper prompts around teacher-given ones, where we're allowed to add framing) should push
> toward *finding what's wrong*, not toward confirming what was handed to them looks fine.

Direct implications for the courtroom pipeline specifically (context, already consistent with
existing rules — recorded here so the reasoning is traceable):
- **Model 1 (context window) is exactly why the advocate agents are single-shot with no shared
  context** — each of the 4 advocates should get *only* the case + its own system prompt, nothing
  from the other advocates. That was already a rule in CLAUDE.md; this module is the underlying
  mechanism/justification for it, worth citing if asked to defend the design.
- **Model 1's "more context isn't better"** is a caution against dumping unnecessary material into
  the judges' bundle beyond case + 4 outputs — resist the urge to pad it "just in case."
- **Model 3 ("read the plan, don't trust its tone")** is the standard we should hold *ourselves* to
  when reviewing what any backend/frontend/testing/devops sub-agent proposes before letting it act
  — read the actual plan content, not how confident it sounds.
- **Model 5 (jagged frontier / calibrated trust)** argues for giving the devops agent (deploy,
  likely higher blast radius) less standing autonomy and more of a gate than, say, a frontend
  styling agent — to be finalized once `docs/agents/devops.md` is written.

## 5. Open Follow-ups From This Module

- [ ] Module 4 (audit trail) is expected next per Module 2's hazard table — likely turns "record
      what happened and why" into a concrete rule for our pipeline runs (e.g. log each agent call:
      prompt, model, output). Flag when it lands.
- [ ] Module 11 (context engineering) will formalize "give the right context, and no more" — revisit
      the advocate/judge bundle construction against it once taught.
