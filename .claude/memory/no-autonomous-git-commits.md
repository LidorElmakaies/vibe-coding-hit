---
name: no-autonomous-git-commits
description: The user commits and pushes git changes themselves - the assistant only drafts commit messages, never runs git add/commit/push on its own
metadata:
  type: feedback
---

For agnet-project, the assistant must **never run `git add`, `git commit`, or `git push` on its
own initiative** — not even for routine doc updates that were previously auto-committed and
pushed each turn. The assistant's role regarding git is limited to **drafting a commit message**
for the user to use themselves; the user stages, commits, and pushes.

**Why:** Given 2026-08-14, after several turns where the assistant committed and pushed doc
changes automatically at the end of each response. The user wants to control what actually lands
in the (public) GitHub history themselves, not have it happen as a side effect of a documentation
turn.

**How to apply:** After making file edits in this repo, stop short of any `git` command entirely
— do not run `git status`/`add`/`commit`/`push` even to check state, unless the user explicitly
asks. Instead, end the turn by offering a ready-to-use commit message (and mention which files
changed) so the user can run the commit themselves. If the user explicitly asks in a given message
for something to be committed/pushed *right now*, that instance-specific request overrides this
default — but the default resets after that turn. Related: [[memory-location]] (repo-local
convention this project already follows for the same "user stays in control of what's durable"
reasoning).
