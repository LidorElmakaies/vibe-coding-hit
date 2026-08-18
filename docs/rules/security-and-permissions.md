# Rules — Security & Permissions

> Part of the split-out rule set — see [`CLAUDE.md`](../../CLAUDE.md) §2 for the pointer.

- **Tool/permission grants are the real boundary, not prompt wording.** `.claude/agents/*.md`
  definitions must restrict each sub-agent to the tools it actually needs — don't rely on a
  system-prompt sentence to do a permission boundary's job. Prefer reversible actions; gate
  irreversible ones (force-push, destructive migrations, prod deploy) explicitly; **do less when
  uncertain** — default to not acting (or asking) rather than proceeding on an unclear call.
  *(Modules 3, 5)*

- **The OpenRouter key never reaches the browser — full stop, no reversal.** It lives and is used
  only on the backend: not in a response body, not in a client-visible env var, not in a log
  shipped anywhere public. *(Module 7)*

- **System prompt text is a different case, as of 2026-08-17 — it *does* now reach the browser.**
  The original rule ("system prompts never reach the browser, stored and used verbatim, never
  authored/edited/tuned by us") is **deliberately reversed** for prompt text specifically, per
  [ADR-0014](../decisions/0014-editable-agent-config-admin-console.md): the Admin/Run Console lets
  the person running it view and edit each agent's current system prompt, model, and output-token
  limit. What doesn't change: **we** (the engineers/agents building this) still never author new
  persuasive content ourselves — the teacher's text is the default every agent loads; editing it
  is a feature for the console's user, not something we do in code. Treat prompt text as ordinary
  application data from here on (stored in the `agent_config` table, sent over normal HTTP,
  editable via a normal form) — it is no longer a secret the way the OpenRouter key is.

- **Every call's audit-trail row must record which prompt/model/token-limit was actually in
  effect for that call**, not just a foreign key to a mutable config row — since config can be
  edited between runs, "what config exists now" and "what config produced this output" are
  different questions once editing is possible, and only the second one makes the audit trail
  trustworthy. See [`docs/rules/audit-and-reliability.md`](audit-and-reliability.md).

- **The `system` role carries whatever prompt is currently configured for that agent (teacher's
  default, or the console user's edit); the `user` role is still ours to construct.** We still
  never fold our own operational instructions (like the soft token-length hint in
  [`docs/cost-budget.md`](../cost-budget.md) §2) into the system role's content — that boundary
  survives the 2026-08-17 reversal above unchanged: whoever/whatever currently occupies the system
  role, the soft length instruction still belongs in the user message we build around the case,
  never mixed into the prompt text itself. *(2026-08-14, updated 2026-08-17)*

- **No agent (including Claude Code itself) runs `git add`/`commit`/`push` on its own
  initiative — ever.** The user stages, commits, and pushes; an agent's job stops at drafting a
  commit message and naming what changed. This applies to any future backend/frontend/testing/
  devops sub-agent too, not just interactive sessions — git write access is not a default
  permission, it's granted explicitly, per the "tool/permission grants are the real boundary"
  rule above. *(User instruction, 2026-08-14 — see `.claude/memory/no-autonomous-git-commits.md`)*
