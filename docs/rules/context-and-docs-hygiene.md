# Rules — Context & Docs Hygiene

> Part of the split-out rule set — see [`CLAUDE.md`](../../CLAUDE.md) §2 for the pointer. All new
> from [Module 11](../modules/module11-context-engineering.md), which is directly about the files
> in this repo — read that module's §5 for a frank self-check of how we've actually been building
> them.

- **Write context files by hand, or leave them out — never commit an unreviewed agent draft.**
  Human-written context files measurably help (~4%); unreviewed model-generated ones measurably
  hurt (~3% worse, 20%+ more tokens). `/init`-style drafts are fine as a *starting point* only —
  add the reasons/constraints yourself and read every line before it's committed.

- **Keep `CLAUDE.md` itself under ~200 lines.** It loads every session; length there costs tokens
  and attention on every single call. Move history/changelog content to
  [`docs/decisions-log.md`](../decisions-log.md) rather than letting it accumulate in the root
  file. Reference docs (`docs/rules/*.md`, `docs/modules/*.md`) are read on demand, not
  auto-loaded, so this length limit applies most strictly to `CLAUDE.md` itself.

- **Put anything critical at the start or end of a file, never buried mid-document.** Attention
  across a long context sags in the middle; repeat anything that truly can't be missed.

- **Every correction becomes a written rule, not a complaint left in chat.** If something goes
  wrong once, the fix is a permanent line in the relevant rules file — written the way a colleague
  would warn the next person, not logged as a one-off gripe.

- **Curate, don't kitchen-sink.** Every item included in context must earn its place; when an
  agent gets something wrong, suspect the context is already too full before assuming it's
  missing something — subtract before you add, and retest after each removal.

- **Review docs on a schedule, checking against five specific failures**: kitchen-sink bloat,
  staleness (describing a project state that's moved on), contradiction (rules that leave the
  agent to guess which one wins), unstated implicit conventions, and briefing that reads as
  scolding rather than direction.

- **A written rule advises; a hook enforces.** For anything that truly must never happen
  (committing secrets, destructive git operations, an unreviewed deploy), prefer an actual
  `PreToolUse` hook in `.claude/settings.json` over relying on a rule file being read and followed.
  Not yet implemented here — see Module 11's Open Follow-ups for the first candidate.
