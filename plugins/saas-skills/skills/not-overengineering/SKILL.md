---
name: not-overengineering
description: >-
  Apply before deciding what to build, how much of it, and on top of what —
  sizing a feature, choosing infrastructure (queue, cache, database, hosting,
  workers), adding a compliance or hardening measure (LGPD, GDPR, audit trail,
  data retention, rate limits, multi-tenancy), or answering "do we need this
  now". Pins every decision to the stage the project is measurably in: no
  users means no compliance work and no scaling work; no traffic means
  in-memory and in-process on one instance. Load it in /spec while scoping
  and planning, in every /implement briefing, in a review that finds a piece
  the stage has not earned, and when the operator asks "is this too much",
  "what can we skip", "do we need Redis / a queue / a cache / LGPD yet".
---

# Skill: `not-overengineering`

**Build the smallest thing that works for the stage the project is in today,
and grow it when use proves the need.** One maintainer, several projects: every
piece added early is a piece to run, secure and re-understand for years, paid
for by nobody yet. The `code-standard` skill keeps a line simple; this one
keeps the *product and its infrastructure* simple.

---

## The stage decides, and it is measured

Name the stage before scoping, planning or provisioning anything. **A stage is
measured, never predicted** — "we will have users soon" is stage 0.

| Stage | Measured by | What it earns |
|---|---|---|
| **0 — no users** | Nobody outside the operator uses it | The feature in its simplest shape. Everything in-process, one instance, one database. No compliance work, no scaling work. |
| **1 — first users** | Real people's data is stored | Compliance for the data actually held, backups, error tracking. Still one instance. |
| **2 — measured load** | A number: one instance or one process no longer holds it (a queue backing up, memory, p95, a second instance) | The one external piece that number names — and only that one. |

Record the stage and its measurement in the epic's `## Assumptions`. A plan
that provisions for a later stage is over-built, whatever the reason given.

---

## Infrastructure follows traffic

**In memory until traffic says otherwise.** A cache is a map with a time to
live inside the process. A queue is the framework's in-process job runner, or
a table the app polls. Redis, a message broker, a worker fleet and a managed
cache come at stage 2, when the number that needs them exists.

**One instance, one database, one process.** A second of any of these is a
stage-2 decision with the measurement in its ADR.

**Scheduled work is a cron on the instance** or the framework's scheduler,
never a scheduling service.

**Losing in-memory state on a restart is acceptable at stage 0 and 1.** Say
so in the code in one line, so nobody adds persistence for a case nobody hit.

**Stack bias still applies:** rule #0 of `AGENTS.md` — provisioned over
serverless while the project is small, pieces that are easy to leave.

---

## Compliance follows the data

**No real personal data held, no compliance work.** LGPD (Brazil's
data-protection law), GDPR, consent flows, retention jobs, audit trails,
erasure endpoints and privacy pages start at stage 1, when the first real
user's data is stored — never at stage 0. Until then they are one line in the
epic's `## Out of scope`, naming the trigger.

**At stage 1, only what the data you hold requires.** A name and an email need
an erasure path and a privacy notice; a payment or a health record needs more.
Match the measure to the data, not to the law's whole text.

**Security basics are not compliance and never wait:** hashed passwords,
parameterized queries, secrets outside the repository, HTTPS, input validation
at the boundary. Retrofitting these is what costs; adding them on day one does
not.

---

## Features grow in slices

**The feature does the one thing the issue asks, in the plainest shape that
passes its criteria.** A second behavior is a second issue.

**No option, role, setting, permission level or edge case until a user hits
it.** One operator using the product is allowed hard-coded values, one role
and a manual step.

**Hard-coded beats configurable** until a second value exists.

**Manual beats automated** until the same thing was done by hand twice.

**A workflow is a function until a state needs to survive a restart.**

**Ship, measure, then extend** — the next slice is decided from what the last
one showed, not from the original wishlist.

---

## When a bigger piece is justified

Exactly one of these, written in the ADR that adds the piece:

- **A measured number** — requests per second, queue depth, p95, memory, a
  second instance.
- **A contract** — a paying customer's stated requirement, or a law that
  applies to data already held.
- **A failure that happened** — with the incident it caused.

"It will be needed", "everyone does it", "it is best practice" and "it is
cheap to add now" are not on the list. Cheap to add is never cheap to keep.

---

## Before deciding

- Which stage is this project in, and what number or fact proves it?
- Is anything here provisioned, coded or planned for a later stage?
- Does the data this holds today actually require the compliance work planned?
- Would an in-process version pass every criterion in the issue?
- What is the smallest slice that ships and can be measured?
- If this piece is deleted from the plan, what breaks — today, not later?
