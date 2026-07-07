# Linear issue template

<!--
The body format for EVERY Linear issue — created by the `plan` skill or by
hand. Linear is the single source of truth for all task state: plans, phases,
tasks, and cross-domain blockers are Linear issues, never files in docs/.

Conventions (all issues):
- English only — title, body, comments.
- Title: imperative and specific ("Add per-user rate limit to login").
  Phase parents: "Phase N — <goal>".
- 1 issue = 1 branch = 1 PR. Use Linear's suggested branch name so the PR
  auto-links; merging the PR closes the issue.
- Dependencies are Linear "Blocked by" relations — never prose, never docs.
- Keep the variant you need, delete the other.
-->

## Variant: phase issue (parent — groups sub-issues, ships nothing itself)

**Objective** — <the measurable outcome of this phase, 1–2 sentences.>

**Scope**

- In: <what this phase covers>
- Out: <what it deliberately does not>

**Success criteria** — <observable result that marks the phase done.>

**Links** — <ADRs, docs, related issues.>

## Variant: task issue (execution unit — one branch, one PR)

**Objective** — <what this task delivers and why, 1–2 sentences.>

`domain: <owning area, e.g. billing>` · `scope: <backend | frontend | iac | migrations>`

**Provides** — <artifacts this issue delivers: endpoint, migration, component, …>

**Requires** — <Linear "Blocked by" relations, or "none">

**Tests (TDD — write these red first)**

- [ ] <unit/integration scenario that must fail before implementation>

**Steps**

- [ ] <concrete, verifiable step>

**Acceptance criteria**

- [ ] <what the PR must demonstrate>
- [ ] CI green (verify, format, bug analysis, readability)

<!-- UI tasks: include screenshot + screen recording deliverables (see the
`design` skill). -->
