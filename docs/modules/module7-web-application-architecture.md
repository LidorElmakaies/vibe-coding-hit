# Module 7 — Modern Web Application Architecture

> Source: `lessons/ASE26 lesson 4.pptx` (ASE-26, Lesson 4, 27.07.2026), slides 29–46 + the module
> description given in chat. A mental-model session, explicitly not a programming course: "you
> cannot direct building a thing whose parts you cannot name," and "directing a build you do not
> understand is not engineering. It is hope."

## 0. Important: the Course's Worked Example Is Our Project

This module's own running example, used slide after slide to teach the request cycle, is called
**"the Tribunal"** — and it is a legal-judgment app: a browser form takes a **charge sheet**
(defendant, act, exact question), a backend calls an LLM through **OpenRouter** and returns an
**opinion**, and a database stores every charge sheet, its opinion, and a full call log. **Confirmed
by the user: this is the same project as agnet-project.** Module 7 shows the simplest possible
version (one backend call, one opinion) to teach the request cycle without multi-agent complexity;
the multi-agent shape (2 defense + 2 prosecution + 3 judges) is where "the Tribunal" grows to,
likely once Modules 14–15 (multi-agent orchestration/design) are taught. Practical consequence
already applied in [`docs/framing.md`](../framing.md) and [`docs/architecture.md`](../architecture.md):
this is a reusable web app — submit any charge sheet, browse past cases — not a one-off script over
a single fixed case.

## 1. Why This Module Exists

The agent writes the code; the human judges the plan. Judging a plan you don't understand isn't
engineering, it's hope. This module stays deliberately at the surface — full depth lives
elsewhere — because the goal is to be able to **specify and check** each part, not to hand-write
it.

## 2. Four Parts, One Motion Through Them

| Part | Role |
|---|---|
| **Browser** | Where the user meets the app |
| **Backend** | Where the authority and the logic sit |
| **Database** | Where the state is kept |
| **Deployment** | What makes it reachable |

**The request cycle** is one action running through all four and back — this is "your anchor":
every piece of an agent's plan sits somewhere on this journey; a part you can't place is a part no
one has understood yet.

### The Tribunal's own request cycle (the deck's worked example)
1. In the browser, the user writes a charge sheet and presses submit.
2. The browser builds an HTTP request and sends it.
3. A gate receives the traffic and routes it to a ready backend.
4. The backend checks the sheet (the check that actually holds — the browser's version can't be
   trusted, see §3).
5. It writes the sheet to the database.
6. It calls the model through OpenRouter and waits.
7. It writes the opinion, and a line for the call, to the database.
8. It sends the opinion back; the browser shows it.

## 3. The Browser — the User's Window, and Untrusted

Runs on the user's own machine, not the server: HTML (structure), CSS (look), JavaScript
(behavior), a little per-visit memory, talks over HTTP. **Its code is sent to the user's machine
and runs in the open — the user can read it, change it, run any version they like.** Consequence,
stated as an absolute: **nothing secret belongs here, and nothing whose correctness must hold
belongs here.** (Explicit example given: you cannot check a password inside the browser and trust
that check.)

## 4. The Backend — Where Authority Lives

Runs on a server *you* control, hidden and trusted where the browser is exposed and not. **The
decisions that count, the secrets, and the logic that must not be changed all live here.** For the
Tribunal specifically: **the backend holds the OpenRouter key, the rubric, and the prompts, and it
alone calls the model.** Browser ↔ backend communication reduces to four verbs most of the time:
fetch, create, change, remove (i.e. read/create/update/delete) — reading a backend plan is often
just listing which verbs act on which things.

## 5. The Database — the System's Memory

The backend forgets everything on restart unless it was written down; the database is where it's
written down. It stores data durably, lets you find one record among many, and keeps linked
changes atomic (all or none). **For the Tribunal: it keeps the charge sheets, the opinions, and a
log of every model call — the model, the verdict, the tokens, the cost, the time.** (Explicitly
posed as a question worth sitting with: "why not just keep that audit trail in a plain file?")

Two families, choice deliberately deferred: **SQL** (tables/rows/columns, strict relations,
queried with SQL) vs. **NoSQL** (flexible documents). "Know that both exist. The choice can wait."

## 6. Deployment — What Makes It Reachable

An app on your own machine isn't reachable by anyone else; deployment puts it where users can
reach it and keeps it running (hosting takes traffic, restarts crashes, scales with load, watches
health). **Why it earns extra respect:** on a laptop, a mistake harms one person who can undo it;
deployed, the same mistake reaches everyone at once and keeps being served until noticed. This is
explicitly why safety (Module 12) and security (Module 17) both weigh most heavily at this layer.

## 7. How This Applies to agnet-project — Concrete Rules Added

Added to [[CLAUDE.md]] §2 Hard Rules:

> **Secrets and system prompts never reach the browser.** The OpenRouter API key, and the 7
> system prompts (4 advocates + 3 judges), must live and execute only on the backend. The browser
> only ever sends a case/charge sheet and receives opinions back — it must never hold the key or
> call OpenRouter directly. *(Module 7)*

Refined the existing Module 4 audit-trail rule with the concrete shape this module supplies:

> The audit trail (§2, Module 4) should concretely store, per model call: **which model, the
> output/verdict, token counts, cost, and time** — plus the case/charge sheet itself and the
> resulting opinion, so a past run can be found and inspected later (not just logged and
> forgotten). *(Modules 4, 7)*

Direct architectural mapping — a first-draft `docs/architecture.md` has been written applying this
module's four-part shape to agnet-project (browser charge-sheet form → backend orchestrating the
7 agent calls and holding all secrets/prompts → database storing cases, all 7 outputs, and the
call log → deployment). See [`docs/architecture.md`](../architecture.md) — marked as a pencil
draft per Module 6's own advice, with open decisions (SQL vs NoSQL, exact deploy target) left
open since this module explicitly says those choices can wait.

## 8. Open Follow-ups From This Module

- [ ] Module 12 (version control) and Module 17 (security) were both flagged here as bearing most
      heavily on the deployment layer — revisit this doc's §6 once they land.
