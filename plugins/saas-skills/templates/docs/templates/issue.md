<!--
Body of a task issue: one task = one workspace = one branch = one PR.
Exported verbatim to the child workspace, which has no tracker access — so it
must be self-sufficient. Created by /spec or by hand.

Conventions:
- English only — title, body, comments.
- Title imperative and specific ("Add per-user rate limit to login").
- Dependencies are tracker "Blocked by" relations — never prose, never docs.
- Delete this comment block before filling it in.
-->

# <Task title>

domain: <owning area, e.g. `src/billing/`>
scope: backend | frontend | migrations | copy | docs | ci
covers: <the copied TEXT of every criterion this task covers — never only ids>
requires: <Blocked-by relations, or "none">
provides: <what downstream tasks can build on: endpoint, migration, component>

## Context

*Starting files and symbols. Decisions already made, with their references
(ADR, issue). What NOT to do.*

## Tests

*Criterion-derived scenarios and the files they live in — see the `tdd`
skill. Config, schema and docs-only slices pass the build gate only
(lint + typecheck) and need no test file.*

- [ ] ...

## Steps

*End-to-end slices, in order. The first is the tracer bullet.*

1. ...

## Acceptance

*What the PR must show, CI green included.*

- [ ] ...
- [ ] CI green
