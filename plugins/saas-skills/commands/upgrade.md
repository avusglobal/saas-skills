---
description: Re-apply the saas-skills templates to this repository after the plugin was updated — CI workflows, the docs system, AGENTS.md and the .claude/saas-skills.json knobs — merging changes without clobbering local adaptations.
argument-hint: (no arguments)
---

# Upgrade this project's saas-skills scaffolding

`/plugin update` already refreshed the skills, hooks and commands — those live
inside the plugin and need nothing from you. This command handles the other
half: the files that were **copied into this repository** by
`/saas-skills:setup` and therefore drift as the templates evolve.

It is an AI-assisted three-way merge: what the templates changed × what this
repository customized. Local adaptations always survive.

## 1. Resolve the range

- `PROJECT` — read `toolkitVersion` from `.claude/saas-skills.json`. If the
  file is missing, this project was never installed: stop and point at
  `/saas-skills:setup`.
- If that file carries `setup.deferred`, a greenfield project's first epic
  has not finished: the lint and tsconfig rules were left to its toolchain
  task, which needs a linter that only exists after the skeleton merges. Their
  absence is not drift — do not port them in and do not treat them as a
  conflict. Say so in one line, name the task that owns them, and merge
  everything else normally.
- `PLUGIN` — read `version` from
  `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`.

If they are equal, verify anyway (step 2 can still find drift from hand
edits), then report "already up to date" and stop.

## 2. Diff templates against the repository

For each installed path, compare what the repository has against
`${CLAUDE_PLUGIN_ROOT}/templates/`:

| Template | In this repository |
|---|---|
| `templates/github/workflows/*.yml` | `.github/workflows/` |
| `templates/docs/` | `docs/` |
| `templates/AGENTS.md` | `AGENTS.md` |
| `templates/saas-skills.json` | `.claude/saas-skills.json` |
| `templates/lint/*` | the linter config and `tsconfig.json` |

Classify every difference before touching anything:

- **Template gained something this repository lacks** → port it in.
- **Local adaptation** (filled knobs, project names, real commands, stack
  tables, written documentation, a section deliberately removed) → keep the
  local value. When the template changed the very lines this repository
  adapted, apply the template's new *structure* and carry the repository's
  *values* into it — and when the two cannot coexist, ask, showing the diff.
  There is no separate list of intentional deviations: the repository's file
  is the record, and the question is how an upgrade respects it.

Rules the templates gained since this project was installed are the common
case here: add them, run the linter once, and report the violation count per
new rule instead of fixing them silently. A rule the project set to a
different level is a local adaptation and survives.

## 3. Reconcile the configuration

`.claude/saas-skills.json` is merged key by key against
`${CLAUDE_PLUGIN_ROOT}/schemas/saas-skills.schema.json`:

- New knobs the schema gained → add them with values proposed from the
  repository's actual layout, and ask before writing a value you inferred.
- Knobs the schema dropped → remove them, naming each one in the report.
- Existing values → never overwritten.

Set `toolkitVersion` to `PLUGIN` once everything else is applied.

## 4. Report and deliver

Deliver as one branch and one pull request, CI watched to green. The body
lists, explicitly:

- what was ported in,
- what was adapted around a local customization (and how),
- what was kept as a local adaptation after asking,
- anything left unresolved for the user to decide.

## Inviolable rules

- **Never overwrite a local adaptation** without asking first and showing
  the diff.
- **Read both sides before merging** — the template and the repository's file.
- A knob whose correct value you cannot derive is a question for the user, not
  a guess.
- Everything written is in English, whatever language the conversation uses.
