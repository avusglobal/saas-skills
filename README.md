# saas-skills

A Claude Code **plugin**: the engineering disciplines, hooks and
workflow automation one maintainer reuses across every SaaS project, packaged
so a project installs them instead of copying them.

The kit assumes a specific operating model — **one developer, many projects**.
Everything favors *simple to build now, simple to re-understand two months
from now*: fewer moving parts over elegant ones, managed and serverless over
anything that must be provisioned or patched by hand, and every unit of work
understandable on its own without tribal knowledge.

## Install

```
/plugin marketplace add gruporezult/saas-skills
/plugin install saas-skills@saas-skills
/saas-skills:setup
```

`/saas-skills:setup` installs the half a plugin cannot deliver — the CI
workflows, the documentation system, `AGENTS.md`, and the configuration the
hooks read — merging with whatever the repository already has.

## What is in it

| Piece | What it gives you |
|---|---|
| Skills | `code-standard` (with the design, dependency and frontend/backend references), `tdd`, `communication`, `spec-verify`. |
| Commands | `/saas-skills:setup`, `:upgrade`, `:plan`, `:implement`. |
| Agents | `spec-critic`, `bug-reviewer`, `spec-verifier`, `simplify`, `approver`, `ship`. |
| Hooks | The deterministic write guard, the docs INDEX reminder, the session bootstrap. |
| Templates | CI workflows, the docs system, `AGENTS.md`, and the lint and TypeScript rules that make part of the standard a build failure. |

`/saas-skills:plan` and `/saas-skills:implement` additionally need Linear, Orca
and `gh`. Everything else works without them.

## Updating an adopted project

Two halves update differently, and the split is the whole reason for this
layout.

**Skills, hooks and commands** live inside the plugin and update themselves:

```
/plugin marketplace update saas-skills
/plugin update saas-skills
```

Nothing was copied into the project, so nothing can drift. A restart applies
the new version.

**Scaffolded files** — `.github/workflows/`, `docs/`, `AGENTS.md`,
`.claude/saas-skills.json` — are real files in the project and do drift. After
a plugin update, run:

```
/saas-skills:upgrade
```

It is a three-way merge: template changes are ported in, local adaptations are
preserved, and anything the repository recorded in `docs/TOOLKIT-DEVIATIONS.md`
is skipped. It delivers a branch and a pull request, never a silent rewrite.

## Configuration lives in the project

A plugin's files are read-only for the projects that install it, so the guard
hook's knobs cannot live in the script the way they would in a copied kit.
They live in the consuming repository at **`.claude/saas-skills.json`**,
described by
[`plugins/saas-skills/schemas/saas-skills.schema.json`](plugins/saas-skills/schemas/saas-skills.schema.json).

Without that file every hook is inert — installing a plugin never changes
behavior in a project that has not opted in.

## Repository layout

```
.claude-plugin/marketplace.json   the marketplace index
plugins/<name>/
├── .claude-plugin/plugin.json    manifest — name, version, metadata
├── README.md                     what the plugin is and when to install it
├── skills/<skill>/SKILL.md       one directory per skill
├── commands/<name>.md            slash commands, namespaced /<plugin>:<name>
├── hooks/hooks.json + *.sh       event handlers
├── templates/                    files a command scaffolds into a project
└── schemas/                      JSON Schema for the project configuration
```

Hook and command paths use `${CLAUDE_PLUGIN_ROOT}`, never a path relative to
the working directory — a plugin is installed to a different location on every
machine.

## Releasing a change

The `version` in `plugin.json` is what an installed project compares against,
so a change nobody can see is a change nobody gets.

```
claude plugin validate .                          # the marketplace
claude plugin validate plugins/saas-skills        # each changed plugin
claude plugin tag plugins/saas-skills --push      # tags <name>--v<version>
```

`claude plugin tag` refuses to tag when `plugin.json` and the marketplace entry
disagree, which is the failure that would otherwise reach adopters silently.
CI runs the validation on every push; tagging is manual and deliberate.

## Adding a skill

1. Create `plugins/<plugin>/skills/<name>/SKILL.md` with `name` and
   `description` frontmatter. The description is the only thing the model reads
   when deciding whether to load the skill — write it as *when to use this*,
   naming the triggers, not as a summary of the contents.
2. **State every rule; explain only the ones the model could not guess.** A
   skill has to be complete enough to point at in a review, so generic
   practice stays declared — but in one line, with no example and no
   rationale. The space goes to this project's settled calls: numeric
   thresholds, tie-breakers between options that are both defensible,
   policies, and facts about this codebase.
3. **Examples only where the rule has a shape that is easy to get wrong.** An
   example demonstrating something the model already does by default is waste.
4. Keep genuinely long supporting material in `references/` next to `SKILL.md`
   and link to it — but a reference file that repeats the skill is worse than
   no reference file.
5. Bump the plugin's `version`, run `claude plugin validate`, and release.

Everything written in this repository is in English, whatever language the
conversation happens in — adopters and their CI reports are not all
Portuguese-speaking.
