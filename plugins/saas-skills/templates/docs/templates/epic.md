<!--
Body of a parent (epic) issue. It is the spec AND the plan — one document.
Created by /spec, read verbatim by the implement
command, the approver and every reviewer, so it must be self-sufficient.
Delete this comment block before filling it in.
-->

# <Epic title>

## Worth building

*New capability only — delete this section for a bug fix, docs or
infrastructure. An answer nobody would stand behind belongs in `## Assumptions`
with `Confirmed? no`, named here as missing.*

| Question | Answer |
| --- | --- |
| Why software, rather than a spreadsheet, a form or an existing product | *the alternative, and what it fails at* |
| Who it is for — this operator, or the market | ... |
| What it saves — hours per week, money per month, or revenue unlocked | ... |

## Problem

*What is wrong or missing today, and for whom. No solution here.*

## Goals

*The measurable outcomes. One line each.*

## Out of scope

*What this epic deliberately does not do. A reviewer blocks work that lands
here.*

## Assumptions

*"Open questions: none" is required before this spec can be approved.*

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| ... | ... | ... | yes / no |

Open questions: none

## Risk sweep

<!--
Large and Complex epics: a row per dimension. Medium: only the dimensions
that apply. Small: skip this section. Each row becomes a requirement or
"N/A because ...". The dimensions come from delivery.riskDomains in
.claude/saas-skills.json plus the generic ones below.
-->

| Dimension | Requirement or N/A |
| --- | --- |
| Idempotency — an external event delivered twice or out of order | ... |
| Amount and currency correctness, where money is involved | ... |
| Personal data: what is stored, for how long, who can read it | ... |
| Access control: expiry, deletion, another tenant's data | ... |
| Concurrency and double submission | ... |
| Dependency outage and fallback | ... |
| Migration: reversibility and the deploy order it forces | ... |

## Acceptance criteria

*EARS form, one behavior per criterion, concrete values — never "correctly".
`WHEN <trigger> THEN the system SHALL <observable result>`, `WHILE <state>`,
`WHERE <context>`, `IF <condition> THEN`.*

- **AC-1** — ...
- **AC-2** — ...

## Edge cases

- IF ... THEN ...

## Success criteria

*How we know this shipped correctly, beyond the AC list.*

## Plan

*Medium and above. Small epics may omit it.*

### Architecture

*New and changed components, in prose.*

### Reuse

| Existing code | How it is leveraged |
| --- | --- |
| ... | ... |

### Risks

| Concern | file:line | Impact | Mitigation |
| --- | --- | --- | --- |
| ... | ... | ... | ... |

### Decisions

*A decision that is hard to reverse, surprising without context, and the
product of a real trade-off becomes an ADR pointing back to this issue
instead — see `docs/templates/adr.md`.*

| # | Decision |
| --- | --- |
| 1 | ... |

### Phases

*Waves of at most two tasks in parallel, and only when they touch different
areas.*

- Wave 1: T1 ... ∥ T2 ...
- Wave 2: T3 ...

## Deferred ideas

*Recorded, not planned. They become issues only if the operator says so.*

## Size

*Small | Medium | Large | Complex — and why.*

## Labels and priority

*Type, risk labels, priority.*
