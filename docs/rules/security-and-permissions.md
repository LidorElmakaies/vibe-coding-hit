# Rules — Security & Permissions

> Part of the split-out rule set — see [`CLAUDE.md`](../../CLAUDE.md) §2 for the pointer.

- **Tool/permission grants are the real boundary, not prompt wording.** `.claude/agents/*.md`
  definitions must restrict each sub-agent to the tools it actually needs — don't rely on a
  system-prompt sentence to do a permission boundary's job. Prefer reversible actions; gate
  irreversible ones (force-push, destructive migrations, prod deploy) explicitly; **do less when
  uncertain** — default to not acting (or asking) rather than proceeding on an unclear call.
  *(Modules 3, 5)*

- **Secrets and system prompts never reach the browser.** The OpenRouter key and all 7 system
  prompts (4 advocates + 3 judges) live and execute only on the backend. The browser only ever
  sends a case and receives outputs back. *(Module 7)*

- **The teacher's judge prompts are stored and used verbatim — never authored, edited, or tuned by
  us.** A project-defining constraint (see `CLAUDE.md` §2), restated here because it's also the
  thing that makes the browser/backend split above meaningful: there's nothing of ours to leak
  from the judge side, only the teacher's prompts, which get the same "never in the browser"
  treatment as our own.
