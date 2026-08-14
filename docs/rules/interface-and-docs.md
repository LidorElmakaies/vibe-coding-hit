# Rules — Interface & Documentation

> Part of the split-out rule set — see [`CLAUDE.md`](../../CLAUDE.md) §2 for the pointer. All new
> from [Module 8](../modules/module8-interface-design-and-documentation.md).

- **Specify every screen with four named decisions — never "make it look good."** User flow
  (including the paths that go wrong — an incomplete charge sheet, a still-deliberating panel);
  information hierarchy (what's seen first — for us, the verdict first, reasons below, all 3
  verdicts shown together rather than requiring the reader to piece together disagreement);
  interaction model (say plainly what's needed — the submission screen needs only a form and a
  button; resist an agent's tendency to add controls no one asked for); feedback design (design
  the slow, failed, and empty states deliberately — agents build the happy path and stop by
  default).

- **A design failure must look like failure, on screen, not just in a log.** Ties directly to
  [`docs/rules/audit-and-reliability.md`](audit-and-reliability.md)'s "never let a model failure
  silently pass through" — the interface-level consequence of that rule: a failed call renders as
  a visible failure state, never as a blank or default that could be read as a real result.

- **A spec needs revisiting as pieces get added, not written once and trusted forever.** Adding
  more verdicts, costs, or timings to a screen that worked fine with less will crowd it — nobody
  broke anything, the screen just needs designing again for its new contents.

- **Commission documentation as a brief, not a blank request.** Name the audience, the purpose,
  the required sections, and the specific decisions the text must explain — "write documentation
  for this" produces everything, in no order, for nobody.

- **Separate descriptive documentation (the what) from explanatory documentation (the why).**
  Agents write descriptive documentation well — the code is right in front of them, check their
  account against it. Explanatory documentation has to come from us: the agent can't read reasons
  that live only in our heads, and left alone it will invent them rather than leave them blank.

See the two Module 8 deliverables this produced:
[`docs/interface-brief-opinion-screen.md`](../interface-brief-opinion-screen.md) and
[`docs/documentation-brief-backend-orchestrator.md`](../documentation-brief-backend-orchestrator.md).
