---
description: >-
  Analyze, spec and plan work, then create the issue tree in Linear.
  Triggers on /saas-skills:spec (also /spec) or when the operator asks to
  plan a feature.
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
and follow it. Everything recorded — issues, specs, comments — is English,
except quoted product copy, which stays in its own language.

**How you size:** read
`${CLAUDE_PLUGIN_ROOT}/skills/not-overengineering/SKILL.md` and follow it.
The project's measured stage decides what the spec asks for, what the plan
provisions and what goes to `## Out of scope` — no compliance work before real
users' data exists, nothing external before a number says in-process no
longer holds. Record the stage and its measurement in `## Assumptions`.

Request: `$ARGUMENTS`. A file path is **input for discovery**, never a
ready-made spec.

---

## 0. Preconditions

Read `.claude/saas-skills.json`:

- **The file is missing and the repository has code** (a package manifest or
  a source tree) ⇒ stop. This project was never set up: tell the operator to
  run `/saas-skills:setup`, which surveys what is already there. Do not guess
  a team and do not create anything.
- **The file is missing and the repository is empty** — no package manifest,
  no source tree ⇒ **this command is the entry point.** Do not send them to
  `/saas-skills:setup`: there is nothing there to survey, and it would only
  ask for a stack nobody has decided yet. Ask for the Linear team here (list
  the teams through the MCP and offer them as the options), keep it for the
  handoff in 0.1, and carry on. `riskLabels`, `riskDomains` and `commands`
  are the handoff's to settle too, so read nothing from a file that does not
  exist.
- **The file exists and carries `setup.deferred`** ⇒ a greenfield pass already
  ran; the lint rules are still owed to the epic. Otherwise this is an
  ordinary project.
- **`delivery.linear.teamKey` present but empty or still a placeholder such as
  `<TEAM>`** ⇒ ask for it, and write it through `/saas-skills:setup`; never
  guess one from the repository name.
- Otherwise take `teamKey`, `riskLabels`, `riskDomains` and `commands` from
  it; they drive the risk sweep, the labels and the test scenarios below.

Linear access, in this order: the **Linear MCP**; then `orca linear`; then
GraphQL with `LINEAR_API_KEY`. None available ⇒ stop and say which one to
connect.

Then read, before planning: `AGENTS.md`, `docs/README.md`, and the docs the
request touches — on an empty repository none of them exist yet, and that is
the greenfield path, not an error. **Never plan work that `/saas-skills:setup` already does** —
CI workflows, the docs system, lint and tsconfig rules, the capability table.
A request that amounts to "set the project up" is answered by pointing at that
command. The one exception is the greenfield case below: on an empty
repository this command decides the stack and then runs setup itself with the
answers.

---

## 0.1 Greenfield — this command is the entry point, and it calls setup

Applies to an empty repository, and to one whose `.claude/saas-skills.json`
carries `setup.deferred`. The order is **plan first, scaffold second**: the
stack is decided here, next to what the product has to do, and
`/saas-skills:setup` is then run with those decisions instead of asking for
them.

### Deciding the stack

- **Never ask "which framework do you prefer".** Propose. Hold every candidate
  to the `dependencies` reference of the `code-standard` skill — a commit in
  the last two years, adopted beyond its author, runs on the production
  runtime, ships its own types, permissive licence, one responsibility, a
  transitive tree you would read — and to the stack bias the kit ships: easy
  to use, easy to configure, cheap to leave, **provisioned infrastructure over
  serverless while the project is small**. Verify each candidate against its
  repository; never propose one from memory.
- Decide it inside `## Plan` (step 7), one capability per question, comparison
  and recommendation separated, in the same approval-in-parts flow as
  everything else. Only the core rows of the capability table are in play; a
  row the product does not need yet stays `<...>`.
- Settle in the same pass, because setup writes them: the **package manager**,
  and the **install, typecheck, lint, format and test commands** the skeleton
  task will create as scripts; the **module layout** and where tests live
  (measured as in step 7 — on an empty repository every signal reads zero, so
  the answer is the default, package by feature, and you say the numbers
  anyway); the **risk labels and risk domains**; and the **deploy target, or
  none**.

### Handing off to setup — after the plan is approved, before the issues exist

Read `${CLAUDE_PLUGIN_ROOT}/commands/setup.md` and execute its greenfield pass
(its section 0b), passing everything above as the handoff: the capability
table rows with the bar each one cleared, the package manager and the five
commands, the module layout and test location, the Linear team, the risk
labels and domains, and the deploy target or none. It writes the docs system,
`AGENTS.md`, the CI workflows and `.claude/saas-skills.json`, and delivers
them as the initial commit.

**It runs before the issues are created**, for two reasons worth remembering:
the stack ADR needs a `docs/` to live in, and the child workspaces need
`AGENTS.md` and the configuration from their very first write.

**Setup never asks the operator anything already approved here.** A question
coming back from it means the handoff was incomplete — answer it from the
plan, not by putting it to the operator twice.

### What the epic must then contain

- The stack as one **ADR** (`docs/templates/adr.md`), written into the `docs/`
  setup just created — hard to reverse, a real trade-off, exactly what an ADR
  is for.
- The **tracer bullet**: the runnable skeleton — the chosen framework, one
  end-to-end behavior with its test, and the package scripts named exactly as
  the workflows setup just wrote call them. Nothing else in that task.
- A **toolchain task**, blocked by the tracer bullet, that finishes what could
  not exist before a linter did: merge
  `${CLAUDE_PLUGIN_ROOT}/templates/lint/*` into the project's linter config
  and `tsconfig.json` following `templates/lint/README.md`, verifying every
  rule name against the installed versions and dropping what does not resolve;
  fill `sessionStart.commands`; then remove `setup.deferred` from
  `.claude/saas-skills.json`. It is the only task allowed to touch that file.
- CI is red until the tracer bullet merges, because the workflows call scripts
  that do not exist yet. Say it once, plainly: that is what the first task
  turns green.

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

### Worth building — three answers before anything else

For a **new capability**. A bug fix, a copy change, docs, infrastructure, or a
change to something already shipped skips this.

Bring your own answer to each one, then put it to the operator. **You name the
cheaper alternative, with the actual tool** — a spreadsheet, a form, a
scheduled export, an off-the-shelf product, a manual step done twice a week —
instead of asking an open "why build this?".

1. **Why is this software at all?** Name what a spreadsheet, a form or an
   existing product would do instead, and what it fails at. "It would be
   slower" is not a failure; a volume it cannot hold, a deadline it cannot
   meet, or a rule it cannot enforce is.
2. **Who is it for — this operator, or the market?** Something one person uses
   is allowed to stay manual, ugly and hard-coded. Something sold has to
   survive a stranger, and that changes the scope, the error handling and the
   criteria before a single one is written.
3. **What does it save, as a number?** Hours per week, money per month, or the
   revenue it unlocks. An estimate the operator will stand behind counts;
   "it improves the experience" does not.

The three answers go in `## Worth building` in the epic. An answer the
operator will not give becomes an assumption with `Confirmed? no`, and the
epic names which of the three is missing.

**A feature that loses to the spreadsheet is not planned.** Say it in one
line, name the alternative, and create nothing. The operator overriding that
is a decision: record it in `## Worth building` and carry on.

### The rest

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

### Play it back before writing anything

Discovery closes with a **readback**: what you understood, in your own words,
before the spec exists. A misunderstanding costs one message here and a whole
epic later.

**Never play it back by quoting the request.** Repeating the operator's own
sentence proves nothing. Say the same thing in different words, in terms of
what a person using it would see, and a mismatch surfaces on its own.

Six lines, in the operator's language, plain words:

- **Building** — the thing in one sentence, as someone using it would describe
  it.
- **For whom, doing what** — who touches it, and what they walk away with.
- **Different afterwards** — what is observably true once it ships and is not
  true today.
- **Not building** — the nearest thing someone would assume is included.
- **Decided for you** — every call you made on their behalf, one line each,
  while reversing it is still free.
- **Still unclear** — what you could not settle, named. Never smoothed over,
  never left for the spec to reveal.

Wait for confirmation or correction. A correction reopens discovery; it is
never patched into the spec afterwards.

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
- The project's stage is in `## Assumptions` with what measures it, and
  nothing in scope belongs to a later stage — a piece the stage has not
  earned is moved to `## Out of scope` with the trigger that brings it back.
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

**Every part opens with one line of what you understood it to mean**, in your
own words and before its content. What is approved is the understanding, not
the wording.

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

**A structure that leaves the default is written into the repository in the
same epic:** the `Module layout` bullet of `AGENTS.md` and
`guard.advisoryContext` in `.claude/saas-skills.json`. Until both say it, the
guard hook keeps injecting the old layout on every write and the decision
exists only in Linear.

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
5. **On a greenfield epic**, the line after it: restart Claude Code before
   `/implement`, so the hooks pick up the configuration setup just wrote.
   There is no second run of setup — the toolchain task owns what was left.
6. Then one question, in chat: save this planning session under
   `docs/sessions/` (`docs/templates/session.md` — the goal, the decisions
   taken and the alternatives they beat, the dead ends discovery hit, what
   stayed open as issues)? Write it only on a yes and regenerate
   `docs/sessions/INDEX.md`. A Small issue with no spec is never asked about.

---

## Inviolable rules

- **Fixed order:** worth building → readback → closing gate → counterpoint →
  approval → creation. Never reversed.
- **Play your understanding back in your own words** — after discovery, and at
  the top of every approval part. Never by quoting the request.
- **Approval always in parts.**
- **spec-critic compares, the operator picks.** It never delivers its own
  keep, change or drop; every comparison waits for a decision before it is
  recorded.
- **Every plan ends with the lane diagram.**
- **Linear is the plan's only home** — never files in the repository.
- **Never plan what `/saas-skills:setup` installs**, except on a greenfield
  project — there this command decides the stack, runs setup with those
  decisions, and plans the skeleton and the toolchain task.
- **Solo-maintainer bias:** if the breakdown needs a diagram to explain the
  diagram, simplify it.
- Everything recorded is English, whatever language the conversation uses.

## When not to write a full spec

- **Small:** a direct issue, still issue → branch → PR. The worth-building
  answers (for a new capability) and the readback still happen; steps 4 to 7
  are skipped, and the issue is created after the readback is confirmed.
- An active epic already covers the topic: add sub-issues to it instead of
  duplicating the parent.
