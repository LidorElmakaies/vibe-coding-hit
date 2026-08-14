---
name: module-processing-workflow
description: How to process each class module the user sends into project docs, including the rule-vs-context distinction
metadata:
  type: feedback
---

The user's course (ASE-26) is taught in modules, sent one at a time in chat, often with an
attached lesson pptx under `lessons/`. Established workflow for handling each one:

1. If a pptx is referenced, extract its text — the Read tool can't open pptx binaries directly.
   Unzip the pptx (it's a zip of XML) and regex-extract `<a:t>...</a:t>` runs per slide, in slide
   order (`grep -oP '(?<=<a:t>).*?(?=</a:t>)'` under `LC_ALL=en_US.UTF-8`, or a small Python regex
   fallback if `-P` isn't available). Delete the extracted folder afterward — it's scratch, not a
   deliverable.
2. Write `docs/modules/moduleN-<slug>.md`: summarize what the module teaches, then a dedicated
   "How This Applies to agnet-project" section connecting it to the actual build.
3. **Explicitly tell the user whether the module produced a new concrete Hard Rule for
   `CLAUDE.md` §2, or was framing/context only with no rule change.** Do not pad either way —
   the user directly tests for this distinction (asked "so there is no rules or information i
   should learn... currently?" after Module 1, which was framing-only). If a rule is added, tag it
   inline in `CLAUDE.md` with its source module, e.g. `*(Module 3)*`.
4. Link the new module doc from `CLAUDE.md` §4's module list.
5. If the module names a hazard/topic that a *later* module will fully resolve, note that as an
   "Open Follow-up" in the module doc so it gets caught when that later module arrives.

**Why:** keeps `docs/modules/` as the durable, skimmable record instead of chat history, and
keeps the user able to trust that anything marked as a "rule" is genuinely load-bearing rather
than restated theory.

**How to apply:** follow steps 1–5 for every future module. Related: [[pref-project-docs-structure]].
