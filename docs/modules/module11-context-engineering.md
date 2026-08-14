# Module 11 — Context Engineering: the Agent's Briefing

> Source: `lessons/ASE26 lesson 6.pptx` (ASE-26, Lesson 6), slides 33–68 + the module description
> given in chat. **This module is about the exact files we've been building all session** —
> `CLAUDE.md`, `docs/`, `.claude/memory/`. Read §5 below first if short on time; it's about us.

## 1. Context Is Deliberately Placed, Not Bumped Into

The model predicts from its context window only — no memory, no store beyond it, unless the
engineer puts something there. **Compete on context, not model**: assume everyone can call the
same model; sound work comes from a middling model with good context, wrong work from the best
model with poor context. "Context engineering" (the mid-2025 term, credited to Karpathy/Lütke)
replaces hunting for perfect wording — the prompt is the easy part.

## 2. Context Is a Budgeted Resource

The window is finite however large it looks, and **filling it fully makes output worse, not
better** — attention doesn't degrade gracefully, it sags, and unevenly: **put critical rules at
the start or end of a file; keep them out of the middle; repeat anything you can't afford to
lose.** Every included item must be *justified*, not merely "might be relevant" (the kitchen-sink
habit is a named failure mode, not a safe default).

Concrete mechanics worth knowing:
- **Every context token is paid for on every call** — a 10k-token file loaded every time is a
  recurring tax, not a one-off cost.
- **Send large, exploratory reads to a subagent** with its own separate window, and bring back
  only a summary — keeps the main session's window clean. (Anthropic's own example: 6,000 tokens
  read by a subagent, 400 tokens of summary returned.)
- **The advertised window is gross, not usable** — system instructions, tool descriptions, memory
  files, and the summarization reserve all eat into it before any real work starts. `/context`
  shows the actual breakdown; `/doctor` proposes a trim list.
- **Give only the tools a task needs** — each tool's description is paid for on every call, and
  each one is an extra judgement the agent has to make ("fifty tools force fifty judgements").
- **Load instructions only when needed** rather than keeping them always-resident — Agent Skills
  cost one line at startup and load their body only when actually invoked. *(Caution from the
  deck itself: a 2026 survey found a third of shared skills hid malicious instructions — read any
  skill before trusting it, including ones we didn't author ourselves.)*
- **Rules can be scoped to files that match a pattern** (`.claude/rules/*.md` with a `paths:`
  field) rather than loading every session — see §5's open follow-up; we haven't verified this
  mechanism's exact syntax yet, so it isn't applied here without checking first.

## 3. Context Is a Designed Artefact — and the Finding That Matters Most Here

`CLAUDE.md`/`AGENTS.md`-style files brief the agent on arrival: what the project is, which
conventions to follow, what to avoid. **The load-bearing finding:**

> Human-written context files improve agent performance by roughly **4%**. Files the model writes
> for itself **cut performance by about 3% and raise token cost by more than 20%.**

**"Write it by hand, or leave it out."** `/init` is fine as a *starting draft* — keep the build
commands and visible conventions it finds, but add the reasons and constraints yourself, and
**review every generated line before committing it.** A file should test three ways: readable to
the agent without contradiction, readable to *you* so you can maintain it, and focused — every
line earning its place, under roughly 200 lines (longer files cost tokens and lose attention;
splitting one bloated file into four smaller loaded files saves nothing if all four still load).

**Cover four kinds of content**: the project's standards/processes, what good work looks like, how
work should be approached, and when to stop and ask.

## 4. Context Is a Maintained System — and Rots in Silence

Not written once — has to change as the project changes. **Bad context is the steady, dominant
cause of bad agent output over time, and it never announces itself** — the agent just keeps acting
on stale briefing. Concrete practices:
- **Write every correction down as a rule, not a complaint.** Replace "the judge returned prose
  again" with "demand the fixed output form twice." (Note: this is the deck's own example, and
  it's literally our judges' failure mode.)
- **Reach for subtraction before addition** when an agent errs — suspect the context is already
  too full before assuming it's missing something; add only what an observed failure actually
  proved missing, and retest after each removal.
- **Review on a fixed schedule**, checking against five named failures: kitchen-sink bloat, stale
  description of a moved/changed project, contradictory rules that leave the agent to guess,
  unstated implicit conventions, and briefing that reads as scolding rather than direction.
- **A file advises; a hook enforces.** `CLAUDE.md` can only ask — a `PreToolUse` hook (configured
  in `settings.json`) can actually block an action Claude decided to take. Reserve hooks for what
  truly must never happen: commits, deletions, deploys.
- Claude Code keeps its own auto-memory per repository (the first ~200 lines load automatically);
  `/memory` opens it for editing, and stale notes should be deleted when they stop matching reality.

## 5. How This Applies to agnet-project — Rules Added, and a Direct Self-Check

New rules file: [`docs/rules/context-and-docs-hygiene.md`](../rules/context-and-docs-hygiene.md)
(curate, don't kitchen-sink; rules at the edges not the middle; corrections become written rules;
scheduled rot-checks against the five failures; hooks over advice for anything that must never
happen).

**Direct application already made this pass**, since we were already over budget: `CLAUDE.md` was
223 lines — over the ~200-line guideline — so it's been trimmed to ~171: the Decisions Log moved
to [`docs/decisions-log.md`](../decisions-log.md) (history isn't a standing rule, doesn't need to
load every session) and the per-module descriptions in §4 were compressed to one line each.

**The self-check this module forces, said plainly:** almost everything in `CLAUDE.md` and `docs/`
has been *assistant-drafted* this session, with review happening mostly through you saying
"continue" or answering a specific fork (like the Tribunal question), not through reading every
line I wrote. Per §3's finding above, that's closer to the "-3%, +20% tokens" pattern than the
"+4%" one — the theory this exact module teaches says these files work better if you've actually
read and edited them by hand, not just approved them in bulk. This isn't hypothetical self-doubt;
it's the module's own claim applied honestly to what we've actually been doing. Worth an explicit
pass from you at some point — not urgent, but flagged rather than glossed over. Tracked as an open
question in `CLAUDE.md` §6.

## 6. Open Follow-ups From This Module

- [ ] **You reading/editing `CLAUDE.md` and `docs/rules/*.md` directly** rather than only
      approving drafts — per §3's finding, this is the single highest-leverage thing left undone.
- [ ] Verify the real `.claude/rules/*.md` + `paths:` frontmatter mechanism (§2) against actual
      Claude Code docs before relying on it — not implemented here since the syntax wasn't
      confirmed, and a malformed rule file would silently fail to load (exactly the rot this
      module warns never announces itself).
- [ ] Once real source files exist, revisit whether any of `docs/rules/*.md` should become actual
      path-scoped `.claude/rules/*.md` (e.g. a backend-only rule set that loads only when backend
      files are touched) instead of a flat file everyone reads regardless.
- [ ] Consider a `PreToolUse` hook for at least one truly-must-never-happen action once the repo
      has real code — top candidate: blocking any diff that adds an OpenRouter key or system
      prompt string to a file under a browser/frontend path (enforces the Module 7 secrets rule in
      code, not just in `docs/rules/security-and-permissions.md`).
