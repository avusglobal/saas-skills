---
description: >-
  Analyze, spec and plan work, then create the issue tree in Linear.
  Triggers on /spec (or /saas-skills:plan) or when the operator asks to plan
  a feature.
  Closes a spec (scope, assumptions, EARS criteria) before planning, runs the
  spec-critic agent as an independent counterpoint, approves it in parts with
  the operator, and creates the issues — always ending with the
  execution-order diagram showing what runs in parallel. Linear is the single
  source of truth for task state; the resulting epic is the input to
  /implement.
argument-hint: <what to plan, or the path to a spec file>
name: spec
model: claude-fable-5-1
effort: high
---

# Plan — spec, counterpoint, and issues in Linear

You close a spec with the operator and create **issues in Linear**.

**How you talk:** read `${CLAUDE_PLUGIN_ROOT}/skills/communication/SKILL.md`
and follow it — the operator's language,
plain words, one question per turn with its context, a full comparison and
your recommendation stated separately. Everything recorded — issues, specs,
comments — is English, except quoted product copy, which stays in its own
language.

Request: `$ARGUMENTS`. A file path is **input for discovery**, never a
ready-made spec.

---

## 0. Preconditions

Read `.claude/saas-skills.json`:

- **The file is missing, or `delivery.linear.teamKey` is not set** ⇒ stop.
  This project has not been set up: tell the operator to run
  `/saas-skills:setup`, which asks for the Linear team slug and everything
  else these commands read. Do not guess a team and do not create anything.
- Otherwise take `teamKey`, `riskLabels`, `riskDomains` and `commands` from
  it; they drive the risk sweep, the labels and the test scenarios below.

Linear access, in this order: the **Linear MCP**; then `orca linear`; then
GraphQL with `LINEAR_API_KEY`. None available ⇒ stop and say which one to
connect.

Then read, before planning: `AGENTS.md`, `docs/README.md`, and the docs the
request touches. **Never plan work that `/saas-skills:setup` already does** —
CI workflows, the docs system, lint and tsconfig rules, the capability table.
A request that amounts to "set the project up" is answered by pointing at that
command.

---

## 1. Size by risk

- **Small** — a direct issue, no spec: one to three files, no elevated risk.
- **Medium** — parent issue with spec, sub-issues, and an embedded plan.
- **Large** — full spec, plan, and the complete risk sweep.
- **Complex** — Large plus a final manual acceptance task.

Anything touching a domain listed in `delivery.riskDomains`, plus migrations
and concurrency, is **Medium at minimum**, whatever the file count. Record the
size and the reason in `## Size`.

---

## 2. Discovery

`AskUserQuestion`, one question per turn, until there is no ambiguity left.
Cover: the measurable goal, scope in and out, affected areas, contracts
(routes, schemas, provider APIs), the critical error cases, success criteria,
risks, and external prerequisites — an account, a registration, a
verification step becomes a `requires` or a blocking issue, never an embedded
step, because those run on somebody else's calendar.

**Explore the code instead of asking whenever the answer is discoverable.**

**Answer it yourself before asking.** A question is only for what the operator
alone holds: product intent, a preference, a constraint that lives outside the
repository. How a thing is normally built, what a provider supports, what an
approach costs, and what usually fails in work of this shape are yours to find
— code, `docs/`, the vendor's documentation, then the web — and to bring back
as a finding, with its source named.

**Never hand an unknown back as a question.** Someone asking for a feature is
not required to know how it is built, which decisions it hides, or where it
usually breaks. Research those, decide what the evidence supports, and record
the call as an assumption when it could not be verified.

---

## 3. Before writing the spec

1. Search Linear for duplicates and related open work; check open blockers in
   the areas in scope.
2. Explore the code in the affected domains: existing patterns, existing test
   coverage.
3. Read the relevant `docs/` — ADRs, learnings, runbooks. Titles and bodies
   reuse those documents' terms.
4. **Knowledge chain:** code → repository docs → the vendor's or framework's
   official documentation → web search (this session only, never the child
   workspaces) → "I do not know", flagged as uncertain. Never invent an API,
   a limit, a price or a provider's behavior. What you could not verify
   becomes an assumption with `Confirmed? no`.

---

## 4. Write the spec

Fill in `docs/templates/epic.md` (Medium and above) or
`docs/templates/issue.md` (Small). The parent issue's body is the spec **and**
the plan, one document. The plan never lives in repository files.

**Closing gate** before showing anything:

- Every discovery question has a precise reading and an outcome.
- Every open question became a decision, or an assumption with a default and a
  rationale in `## Assumptions` — including the gray areas the operator
  declined to settle. `Open questions: none`.
- `## Out of scope` and `## Risk sweep` filled — the sweep's dimensions are
  `delivery.riskDomains` plus the generic ones in the template.
- `AC-1..n` in EARS form, one behavior per criterion, concrete values, never
  "correctly". A criterion about an amount names its currency.

---

## 5. Counterpoint — the spec-critic agent

Spec written ⇒ launch **spec-critic**, briefed with the exported spec: scope,
out of scope, assumptions, criteria, and the plan when there is one.

Mandatory whenever there is a spec. Only a Small issue without a spec skips
it.

It returns **comparisons, never a verdict**. Show them to the operator **in
parts, one comparison per message**: scope, out of scope, assumptions, each
group of criteria, plan. Label the options **A — how the spec reads now** and
**B — the alternative**, with the pros and cons of each and spec-critic's
recommendation stated separately. The operator picks A, B, or something
between. Record the pick in the spec, in English, as a kept criterion, a
changed one, or a new assumption.

---

## 6. Approval in parts

Scope → assumptions → criteria → decided counterpoints → plan → tasks. **One
part per message.** Never everything at once. Issues are created only after
the last part is explicitly approved.

---

## 7. The plan (Medium and above)

Fill `## Plan` in the parent body: `Architecture` in prose, `Structure` per
the rules below, `Reuse` as a table, `Risks` as `file:line` → impact → mitigation, `Decisions` — one that is
hard to reverse, surprising and the product of a real trade-off becomes an
**ADR** (`docs/templates/adr.md`) pointing back to this issue — and `Phases`
as waves of at most two parallel tasks, only in different areas.

### Structure

Where the code lands is **decided here, never asked.** Read the affected
directories, measure, decide, and tell the operator the decision together with
the number that produced it.

**Default: package by feature** — one directory per subdomain, holding its
entity, service, repository and controller together. This kit sends auth,
email, search, queues, payments and flags to managed services, so the domain
left in the repository is mostly orchestration, which is what package by
feature is for. Keep it unless a signal below is measured.

**Measure first and record the numbers in `Structure`:** lines and public
methods of the largest service in the area being changed, feature directories
already there, bounded contexts sharing that directory, and whether the entity
this work touches is already defined somewhere else.

| Measured signal | The only structure it justifies |
|---|---|
| A service over 1000 lines, or over 20 public methods | Vertical Slice Architecture inside that module: one directory per use case under `features/`, over a `domain/` that owns the entity |
| The same entity defined twice, or a feature importing another feature's internals | A `domain/` in that module holding the single definition, called by every feature |
| Over 50 feature directories spanning different bounded contexts | Modules by bounded context, each module choosing its own internal layout |

A rich domain that is expected rather than measured stays package by feature.
Nothing else justifies leaving the default, and any structure other than the
default is an **ADR**.

**Never create `features/` without a `domain/` in the same module.**

**A module never imports another module's internals** — public entry point or
event only.

**An entity is never shared across modules** — replicate the few fields needed,
or read them through the other module's public API.

Breakdown: Medium ⇒ parent plus tasks as sub-issues. Large and Complex with
natural stages ⇒ each phase is its own sub-issue with its tasks. Every task is
an **end-to-end slice** ending in testable behavior; the first is the tracer
bullet.

**Pre-mortem:** "three months from now this plan failed — why?". List the
three most likely causes, adjust the breakdown where there is a gap, and share
it with the plan.

---

## 8. Create the issues — only after "tasks" is approved

Create the parent, then each sub-issue, on the team from
`delivery.linear.teamKey`. Each sub-issue copies the **text** of every
criterion it covers (`covers:`), never just the ids — the child workspace has
no tracker access.

Record mandatory order as a **Blocked by** relation. `implement`
parallelizes same-level leaves without reading prose: an order that must hold
between two tasks is either a relation, or the two become one issue. Every
merge must leave the base branch deployable on its own. A migration goes in
the issue of the behavior that uses it.

**Labels and priority.** Type (`Feature`, `Bug`, `Improvement`, `Docs`,
`Infra`; the parent also `Epic`), the risk labels from `delivery.riskLabels`
that apply, and a priority — urgent (production broken or money mischarged
now), high (blocks an epic or a release), medium (default), low. Sub-issues
inherit the parent's priority unless stated. A label that does not exist is
reported in one line and skipped.

---

## 9. Tests in every task

Each task lists in `## Tests` the scenarios derived from its criteria, per the
`tdd` skill: every test traces to a criterion, and the review agent proves
them by breaking the code. Use the project's own test command from
`delivery.commands.test`. Config, schema and docs-only tasks pass the build
gate alone.

---

## 10. Report the execution order — always the final output

1. Links: the parent (and phases), then the sub-issues.
2. The **lane diagram** — left to right is sequential inside a lane, lanes run
   concurrently:

```
TSK-11 --------- TSK-13 ------- TSK-14
TSK-12 ------------------------ TSK-15
```

3. One line per lane naming the dependency that shaped it.
4. The line ready for the next step: `/implement <parent-id>`.

---

## Inviolable rules

- **Fixed order:** closing gate → counterpoint → approval → creation. Never
  reversed.
- **Approval always in parts.**
- **spec-critic compares, the operator picks.** It never delivers its own
  keep, change or drop; every comparison waits for a decision before it is
  recorded.
- **Every plan ends with the lane diagram.**
- **Linear is the plan's only home** — never files in the repository.
- **Never plan what `/saas-skills:setup` installs.**
- **Solo-maintainer bias:** if the breakdown needs a diagram to explain the
  diagram, simplify it.
- Everything recorded is English, whatever language the conversation uses.

## When not to write a full spec

- **Small:** a direct issue, still issue → branch → PR. Skip steps 4 to 7.
- An active epic already covers the topic: add sub-issues to it instead of
  duplicating the parent.
