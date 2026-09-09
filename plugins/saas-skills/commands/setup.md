---
description: >-
  Set up this repository to work with saas-skills. Surveys the project,
  fills the capability table with libraries that clear the adoption bar,
  adopts the skills those libraries already publish, proposes the MCP
  servers the stack deserves, then shows the whole plan and waits for
  approval before writing anything: the CI workflows, the docs system,
  AGENTS.md, the lint and tsconfig rules, and every knob the plugin reads.
  Run it once, after installing the plugin; use /saas-skills:upgrade
  afterwards.
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

**Plan first, write second.** Steps 1 to 4 only read and decide; step 5 lays
the whole plan in front of the operator and waits for one approval. Nothing
in the repository changes before that approval — not a file, not a config
key, not a lint rule. Steps 6 to 8 execute the approved plan and nothing
else; anything the execution reveals that the plan did not cover goes back to
the operator as a question, never as a silent addition.

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

## 3. Adopt the skills this project's libraries already publish

A skill teaches the agent one library the way its maintainers use it, so it
stops writing that library from memory. Many of the libraries you just wrote
into the capability table publish one, shipped inside a plugin.

1. `claude plugin marketplace list` — the marketplaces already configured.
   Claude Code ships with `claude-plugins-official`. Add another only when the
   operator names one: `claude plugin marketplace add <owner/repo>`.
2. `claude plugin list --available --json` — every plugin those marketplaces
   offer, each with its own description, next to what is already installed.
   **That listing is the only source: a plugin exists only if it appears
   there.** Never propose one from memory, and never invent a plugin name.
3. Match it against the survey and the capability table — the framework, the
   database client, the payment provider, the test runner, the deploy target,
   the error tracker. Match on what the plugin says it covers, not on a name
   that merely looks alike.
4. Hold every candidate to a bar, because an installed skill costs context in
   **every** session, whether it fires or not:
   - it covers something the project uses today, not something it might;
   - it comes from the library's own maintainers, or its description names the
     version this project runs;
   - it earns that cost. `claude plugin details <name>` prints the always-on
     tokens and the per-skill cost, but only for an installed plugin — so
     install, measure, report the number, and
     `claude plugin uninstall <name>` whatever did not earn it.
5. Ask one plugin per question, with the exact command:
   `claude plugin install <name>@<marketplace>`. Installing asks the operator
   to trust the marketplace and needs a restart to take effect — say both.
6. A plugin is the operator's own state, not the repository's: whoever clones
   this repository next does not get it. List the adopted ones in the final
   report, with their install commands, so the set can be reproduced.

A vendor's plugin often bundles that vendor's MCP server too. When it does,
adopting it here settles the next step for that service.

---

## 4. Propose the MCP servers the stack deserves

An MCP server lets the agent read the real state of a service instead of
guessing at it — the issue tracker, the database, the payment provider, the
error tracker.

1. `claude mcp list` — what is already connected. Skip any server a
   plugin adopted in step 3 already brings.
2. For each service in the survey and in the capability table, check whether
   its vendor publishes an MCP server. Verify it exists before naming it;
   never invent a server or a URL.
3. Propose the missing ones, ordered by how often this project would use them,
   with the exact command:
   `claude mcp add --transport http <name> <url>` for a hosted server, or
   `claude mcp add <name> -- <command>` for a local one.
4. **You cannot finish these for the operator** when they need a login — say
   which need `claude mcp login <name>` afterwards.

`/spec` and `/implement` need the **Linear** MCP. When
the operator plans in Linear and it is not connected, this is the first server
you propose.

---

## 5. Write the plan and get it approved

Everything decided so far becomes one plan, shown in one message, in the
operator's language. It is the contract for the rest of the command: what
steps 6 to 8 will do, file by file, and nothing more.

- **Files** — one line per path: `create` from which template, or `merge`
  into an existing file with which sections ported and which kept. The
  toolchain block and every `<... command>` placeholder with the value they
  get.
- **Capability table** — every row that will be written and where its value
  came from (already in use, or proposed in step 2 and approved).
- **Library plugins** — the ones adopted in step 3, with their install
  commands.
- **MCP servers** — the ones to add, with the exact command, and which need a
  login afterwards.
- **Lint and tsconfig** — the rules to be added, the ones the project already
  sets differently and will be kept, and the ones that will stay review-only
  on this stack, with the reason.
- **Knobs** — every key of `.claude/saas-skills.json` with its value, and
  which values were inferred rather than read.
- **Delivery** — branch and pull request, or the initial commit for a
  repository with no history.
- **For the operator afterwards** — secrets, logins, the restart.

Then one `AskUserQuestion`: approve as is, or change something. A change
edits the plan and asks again; the plan is written only when it is approved
whole. The final report in step 10 is checked against this plan, line by
line — a deviation is reported, never hidden.

---

## 6. Copy the templates, merging with what is there

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

## 7. Make the code standard enforceable

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

## 8. Write the knobs

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
  **Copy the `Module layout` bullet of `AGENTS.md` into it, in the project's
  own paths and file naming.** A repository with no layout of its own gets the
  template's default — package by feature, one directory per subdomain.
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

## 9. Say which parts of the kit this project can use

From the survey, name what applies and what does not, so nothing sits unused
without the operator knowing why:

| Part | Usable when |
|---|---|
| The skills, the hooks, `upgrade` | Always. |
| `/spec` and `/implement` | Work is planned in Linear, Orca manages the worktrees, and `gh` is authenticated. Name whichever of the three is missing. |
| The `delivery` agents | Same requirements — they run inside `implement`. |

---

## 10. Report what only the operator can do

- Create the `CLAUDE_CODE_OAUTH_TOKEN` repository secret, needed by the two AI
  analysis workflows: `claude setup-token`.
- Authenticate any MCP server proposed in step 4: `claude mcp login <name>`.
- Restart the session so the newly written hook configuration is picked up.

Then the summary, checked against the plan approved in step 5: what was
written, what was filled in the capability table and from where, which
library plugins were adopted and their install commands, which rules are now
enforced by the build, which stayed review-only, every decision you made on
their behalf, and anything that ended up different from the plan and why.

---

## Delivery

Branch and pull request like any other change, CI watched to green. The one
exception is a brand-new repository with no history and no CI — there an
initial commit on the default branch is fine, and you say so explicitly.

## Inviolable rules

- **Plan before writing.** Nothing changes in the repository before the plan
  in step 5 is approved, and nothing outside that plan changes after.
- **Read before writing.** Every file you merge into, you read first.
- **Never overwrite hand-written content** without showing the diff and asking.
- **No invented commands, libraries, plugins, MCP servers or config keys.**
  Anything you could not verify gets reported as unverified, never written as
  fact.
- One question per turn, with the comparison and the recommendation separated.
- Everything written is in English, whatever language the conversation uses.
