# CLAUDE.md — saas-skills

The Claude Code plugin marketplace described in [README.md](README.md). Read it
before changing anything under `plugins/`.

## Talking to me

The `communication` skill is installed at `.claude/skills/communication`
(a link to `plugins/saas-skills/skills/communication`, so the kit and this
repository never drift). Its rules apply to **every** message, whether or not
the skill was loaded — read it when a message is more than one line:

- **Reply in the language I wrote in.** Everything that lands in the
  repository — code, comments, commits, pull requests, docs — is English.
- **Plain words, short first.** The first sentence says the thing. A technical
  term is allowed once you say what it means, in your own words.
- **One question per turn,** with its context and a full comparison of the
  options — advantages, disadvantages, and nothing assumed. Say which you
  recommend, as a separate line I can reject.
- **State plainly what is done, what failed, and what is waiting on me.**
- **Write so compaction keeps it.** Constraints as orders on their own line,
  identifiers spelled out instead of "the one we picked", and anything that
  has to outlive the session written into the repository, not only told to me.

## Working here

Everything written in this repository is in English, whatever language the
conversation is in. The standards this kit ships — `code-standard`, `tdd`,
`communication` — apply to this repository too.
