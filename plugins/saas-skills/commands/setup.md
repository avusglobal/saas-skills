---
description: >-
  Set up this repository to work with the saas-skills. One pass: surveys the
  project, fills the capability table with libraries that clear the adoption
  bar, proposes the MCP servers the stack deserves, scaffolds the CI
  workflows, the docs system and AGENTS.md, wires the code standard into the
  linter and tsconfig, writes every knob the plugins read, and says which
  saas-skills plugins this project should install. Run it once, after
  installing the plugin; use /saas-skills:upgrade afterwards.
argument-hint: (no arguments)
---

# Set up this project

The plugins already provide the skills, hooks, agents and commands — those
update on their own through `/plugin update`. This command installs everything
that has to physically exist in **this** repository, and settles everything the
plugins need to know about it.

Templates live at `${CLAUDE_PLUGIN_ROOT}/templates/`. Read them before copying —
never write a file you have not read.

**How you talk during this command:** read
`${CLAUDE_PLUGIN_ROOT}/skills/communication/SKILL.md` and follow it. One
question per turn via `AskUserQuestion`, each with its context, a full
comparison of the options — advantages, disadvantages, nothing assumed — and
your recommendation stated separately, marked `(Recommended)`. The operator
decides.

**Stop condition:** `.claude/saas-skills.json` already exists ⇒ this project is
already set up. Say so and run `/saas-skills:upgrade` instead.

---

## 1. Survey before writing

Establish what exists, because everything below merges rather than overwrites.
Report the survey in one short table before touching anything.

- **Stack.** Package manifest and lockfile — the real package manager, the
  framework, the runtime, the database client, the test runner. Never guess
  the package manager from the manifest alone; the lockfile decides.
- **Layout.** `src/` module folders, layer file names, where tests live.
- **CI.** `.github/workflows/` — what is present, and the real install,
  typecheck, lint and test commands.
- **Docs.** `docs/` — whether ADRs, learnings or runbooks already exist.
- **Root context.** `AGENTS.md` or `CLAUDE.md`.
- **Enforcement.** The linter (ESLint, Biome, oxlint, none), its version, its
  configured rules, and `tsconfig.json`.
- **Deployment.** How this project reaches production, if it does yet.
- **Issue tracker.** Whether the repository already links to Linear, and which
  team.
- **MCP servers.** `claude mcp list`.

---

## 2. Fill the capability table

`templates/AGENTS.md` carries a table with one row per capability and the rule
that **the default answer is a library or a service, never our own code.** An
empty row is an invitation to hand-roll, so this step fills it.

For each **core** row: read what the project already uses and write it in.
When a row is genuinely unused yet, leave it as `<...>` — do not invent a
future.

For each row the project needs but has no answer for, **search for a library
before proposing anything of our own**, and hold it to the bar in the
`code-standard` skill's `dependencies` reference — read that file first. The
bar, condensed:

- a commit in the last two years (check the commit history, not the release
  list);
- adopted beyond its author;
- runs on the production runtime, ships its own types, permissive license;
- focused on one responsibility;
- a transitive tree you are willing to read, no open advisory.

Verify each candidate against its repository — never propose from memory. Two
candidates that both clear the bar ⇒ propose the more used one and say why the
other is close. Nothing clears the bar ⇒ say so plainly and leave the row
empty; an honest gap beats a bad default.

Ask before writing any row the project does not already use. One capability
per question.

---

## 3. Propose the MCP servers the stack deserves

An MCP server lets the agent read the real state of a service instead of
guessing at it — the issue tracker, the database, the payment provider, the
error tracker.

1. `claude mcp list` — what is already connected.
2. For each service in the survey and in the capability table, check whether
   its vendor publishes an MCP server. Verify it exists before naming it;
   never invent a server or a URL.
3. Propose the missing ones, ordered by how often this project would use them,
   with the exact command:
   `claude mcp add --transport http <name> <url>` for a hosted server, or
   `claude mcp add <name> -- <command>` for a local one.
4. **You cannot finish these for the operator** when they need a login — say
   which need `claude mcp login <name>` afterwards.

`/saas-skills:plan` and `/saas-skills:implement` need the **Linear** MCP. When
the operator plans in Linear and it is not connected, this is the first server
you propose.

---

## 4. Copy the templates, merging with what is there

| Template | Installs at | On conflict |
|---|---|---|
| `templates/github/workflows/*.yml` | `.github/workflows/` | Keep the existing file; show the diff and ask which parts to port. |
| `templates/docs/` | `docs/` | Merge — never drop existing documents; the template's conventions win only where the repository has none. |
| `templates/AGENTS.md` | `AGENTS.md` | If one exists, merge the sections it lacks — never overwrite written content. Keep the capability table filled in step 2. |
| `templates/saas-skills.json` | `.claude/saas-skills.json` | Never overwrite — that path is the stop condition above. |

The workflows carry a commented toolchain block (Node or Bun — uncomment the
one the lockfile says, pin its version) and `<... command>` placeholders for
install, typecheck, lint, test and format. Fill every placeholder with the
real command from step 1; the commands must exist as scripts in the package
manifest, so CI and the laptop never diverge. A missing script gets reported,
never invented.

---

## 5. Make the code standard enforceable

The `code-standard` skill states about sixty rules; sixteen a linter can decide
on its own. Those belong in the build, not in a review comment.
`${CLAUDE_PLUGIN_ROOT}/templates/lint/README.md` is the mapping — read it
first, it also says what each tool cannot cover.

| Fragment | Merges into |
|---|---|
| `templates/lint/eslint.rules.js` | the flat config — `codeSimplicityRules`, plus `codeSimplicityReactRules` on React |
| `templates/lint/biome.rules.json` | `biome.json` |
| `templates/lint/tsconfig.compilerOptions.json` | `tsconfig.json` |

- **Never replace an existing configuration.** A rule the project already sets
  to another level is a local decision: keep it and list it in the report.
- **Verify every rule name against the installed versions.** A config that
  fails to load is worse than a smaller one — drop what does not resolve and
  count it as uncovered.
- The type-aware ESLint rules need `parserOptions.projectService`. Without a
  type-aware setup, either wire one or drop those rules; never write a rule
  that silently does nothing.
- **Run the linter and the typecheck once**, on the real source tree, and
  report the violation count per rule. An existing codebase will light up:
  propose a path (warn first, error later, or a baseline), never a mass
  auto-fix and never a blanket disable.
- `exactOptionalPropertyTypes` is the first flag to drop when adopting late.

End the step naming what stayed uncovered on this stack. On a Biome project
seven of the sixteen have no equivalent and remain review-only.

---

## 6. Write the knobs

`.claude/saas-skills.json` is what makes the hooks and the delivery agents do
anything at all — until it exists they are inert by design. The schema is at
`${CLAUDE_PLUGIN_ROOT}/schemas/saas-skills.schema.json`; read it before
writing, and never write a key it does not define.

**Always:**

- `guard.forbiddenPatterns` — runtime APIs that must never reach shipped code.
  Derive candidates from the deploy target: an edge runtime forbids Node and
  Bun built-ins; shared code forbids server-only APIs. An empty list is a
  valid answer.
- `guard.pathScope`, `guard.testFilePatterns` — the real source and test
  layout, not the defaults.
- `guard.advisoryContext` — the judgment rules injected on every allowed write:
  the TDD reminder, the module layout and file naming read off the existing
  `src/` tree, domain boundaries. Nothing here blocks; it is context.
- `docsSync.watchPaths` — which documentation paths trigger the INDEX
  regeneration reminder.
- `sessionStart.commands` — the install and local-stack commands that make
  tests runnable from the first message of a web session. Run each one before
  writing it.

**When the operator plans and tracks work in Linear** (ask, one question):

- `delivery.linear.teamKey` — **the team's slug in Linear**, the prefix its
  issues carry (`ENG`, `LOVI`, `ACME`). Ask for it; never guess it from the
  repository name. With the Linear MCP connected you may list the teams and
  offer them as the options.
- `delivery.linear.projectId` — optional, when work belongs to one project.
- `delivery.riskLabels` — the labels that make an epic need the operator's own
  approval on top of the `approver` agent. Propose from the project's real
  risk areas; `[]` is valid.
- `delivery.riskDomains` — one entry per area the reviewers must weigh extra,
  each naming the area and what tends to break in it. This is what makes
  `bug-reviewer` and `spec-verifier` sharp instead of generic.
- `delivery.commands` — install, lint, typecheck, test, exactly as in CI.
- `delivery.deploy` — `healthUrl`, `statusCommand`, `requiredEnvVars`,
  `timeoutSeconds`. **Omit the whole block when there is no deploy check** —
  `ship` then finishes at "merged, issue closed" instead of claiming a
  deployment it never saw.

Set `toolkitVersion` to the `version` in
`${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`.

---

## 7. Say which parts of the kit this project can use

From the survey, name what applies and what does not, so nothing sits unused
without the operator knowing why:

| Part | Usable when |
|---|---|
| The skills, the hooks, `upgrade` | Always. |
| `/saas-skills:plan` and `/saas-skills:implement` | Work is planned in Linear, Orca manages the worktrees, and `gh` is authenticated. Name whichever of the three is missing. |
| The `delivery` agents | Same requirements — they run inside `implement`. |

---

## 8. Report what only the operator can do

- Create the `CLAUDE_CODE_OAUTH_TOKEN` repository secret, needed by the two AI
  analysis workflows: `claude setup-token`.
- Authenticate any MCP server proposed in step 3: `claude mcp login <name>`.
- Restart the session so the newly written hook configuration is picked up.

Then the summary: what was written, what was filled in the capability table and
from where, which rules are now enforced by the build, which stayed
review-only, and every decision you made on their behalf.

---

## Delivery

Branch and pull request like any other change, CI watched to green. The one
exception is a brand-new repository with no history and no CI — there an
initial commit on the default branch is fine, and you say so explicitly.

## Inviolable rules

- **Read before writing.** Every file you merge into, you read first.
- **Never overwrite hand-written content** without showing the diff and asking.
- **No invented commands, libraries, MCP servers or config keys.** Anything you
  could not verify gets reported as unverified, never written as fact.
- One question per turn, with the comparison and the recommendation separated.
- Everything written is in English, whatever language the conversation uses.
