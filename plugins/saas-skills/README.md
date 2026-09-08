# saas-skills

The whole kit in one plugin: the engineering disciplines, the hooks that
enforce them, the two commands that install and update the part of the kit
that must live inside your repository, and the Linear-driven delivery pipeline
— planning, implementation and the agents that review, approve and ship.

```
/plugin marketplace add gruporezult/saas-skills
/plugin install saas-skills@saas-skills
/saas-skills:setup
```

## What is inside

| Component | What it does |
|---|---|
| `commands/setup.md` | `/saas-skills:setup` — surveys the project, fills the capability table with libraries that clear the adoption bar, proposes the MCP servers the stack deserves, scaffolds CI, docs and `AGENTS.md`, wires the code standard into the linter, and writes every knob the plugin reads. |
| `commands/upgrade.md` | `/saas-skills:upgrade` — re-applies template changes without clobbering local adaptations. |
| `commands/plan.md` | `/spec` (or `/saas-skills:plan`) — closes a spec, runs the counterpoint agent, approves it part by part, creates the Linear issue tree. |
| `commands/implement.md` | `/implement` (or `/saas-skills:implement`) — orchestrates the tree in Orca child workspaces through review, simplify, the merge gate and ship. |
| `skills/code-standard/` | The whole code standard, routing by condition to the design step, the dependency bar, and the frontend and backend deltas. |
| `skills/tdd/` | The failing test first, traced to what the task asked for, and the mutation pass that proves the tests are real. |
| `skills/communication/` | How the agent talks to you: your language, plain words, one question per turn with a full comparison. |
| `skills/spec-verify/` | The procedure the `spec-verifier` agent follows. |
| `agents/` | `spec-critic`, `bug-reviewer`, `spec-verifier`, `simplify`, `approver`, `ship`. |
| `hooks/` | The write guard (PreToolUse), the docs INDEX reminder (PostToolUse), the environment bootstrap (SessionStart). |
| `templates/` | What `/saas-skills:setup` copies in — CI workflows, the docs system, `AGENTS.md`, and the lint and TypeScript rules that turn part of the code standard into a build failure. |
| `schemas/` | JSON Schema for the project configuration. |

## Configuration

Everything project-specific lives in the consuming repository at
**`.claude/saas-skills.json`**, written by `/saas-skills:setup` and described
by [`schemas/saas-skills.schema.json`](schemas/saas-skills.schema.json).

**Without that file the hooks are inert and the delivery commands stop.**
Installing the plugin never changes behavior in a project that has not opted
in — a session restart is needed after the file is first written.

| Section | Drives |
|---|---|
| `guard.forbiddenPatterns` | Runtime APIs that must never reach shipped code. A match blocks the write. |
| `guard.advisoryContext` | Judgment rules injected as context on every allowed write — never a hard block. |
| `docsSync.watchPaths` | Which documentation paths trigger the INDEX regeneration reminder. |
| `sessionStart.commands` | Install and local-stack commands, on web sessions only by default. |
| `delivery.linear.teamKey` | The team slug in Linear. Asked during setup; without it `plan` and `implement` refuse to run. |
| `delivery.riskLabels` | Labels that make an epic need your own approval on top of the `approver` agent. |
| `delivery.riskDomains` | The areas the reviewers weigh extra — what makes them sharp instead of generic. |
| `delivery.commands` | Install, lint, typecheck and test, exactly as CI runs them. Agents never invent one. |
| `delivery.deploy` | Deploy verification for `ship`. Omit it entirely and `ship` stops at "merged, issue closed". |

## Delivery requirements

`/spec` and `/implement` need more than the plugin:
**Linear** (the MCP, `orca linear`, or `LINEAR_API_KEY`), **Orca**-managed
worktrees, and an authenticated **`gh`**. The rest of the kit works without
any of them.

Each agent's last line is a fixed `RESULT:` or `APPROVER:` string — that is the
contract `implement` reads to decide what happens next. Do not reword them.

## How the code standard is actually enforced

A skill is context, not an obligation. The kit does not pretend otherwise — it
splits the `code-standard` rules across four layers by how much each one can
guarantee:

| Layer | Guarantee |
|---|---|
| The lint and `tsconfig` rules `/saas-skills:setup` merges in | Absolute — sixteen rules fail the build |
| `guard.advisoryContext` (injected on every allowed write) | Deterministically in context, still a judgment call |
| The skill, loaded by description | None — the model decides to read it |
| `readability-analysis.yml` reviewing the diff | Independent second opinion, not deterministic |

[`templates/lint/README.md`](templates/lint/README.md) is the rule-by-rule
mapping, including what each linter cannot cover — on a Biome project seven of
the sixteen have no equivalent and stay review-only.

## The guard's design

Only what a script can decide with certainty blocks a write, and that is one
rule: a forbidden runtime API in shipped code. Everything else — layout,
naming, boundaries — is judgment, injected as context, with CI and the
reviewers as the real backstop.
