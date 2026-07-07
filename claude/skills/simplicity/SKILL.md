---
name: simplicity
description: Apply when writing, refactoring, or reviewing any application code. Biases every decision toward the simplest thing that works — reach for the existing stack before writing custom logic, avoid speculative abstractions and over-engineering, and keep code readable through descriptive names instead of comments.
---

# Skill: `simplicity`

The default bias for all code in this project: **the simplest thing that works, done well.** Less code is better than more. Reuse beats reinvention. Reach for a tool before writing a mechanism.

## Decision order (before writing any code)

1. **Does a stack dependency already do this?** Use it. Don't reimplement.
2. **Does the platform (Web standard / runtime built-in) already do this?** Use it.
3. **Can an existing function/module in this repo do this?** Reuse or extend it.
4. **Is this complex logic someone has already solved well?** (dates,
   money, parsing, diffing, state machines, retries/queues, fuzzy search…)
   Search for a **well-maintained library** that takes that responsibility
   instead of growing it in-repo — see "Adding a dependency" below.
5. **Only then** write new code — the minimum that satisfies the failing test.

## Use the stack — don't rebuild it

Fill this table with your project's actual stack when adopting the skill, one row per capability. The point is that the agent checks the table before hand-rolling anything:

| Need | Use this — not custom code |
|---|---|
| Auth, sessions, password hashing | *your auth library* |
| DB schema, queries, migrations | *your ORM / query builder* |
| Validation / parsing / typing input | *your schema library (e.g. Zod, TypeBox)* |
| HTTP routing, middleware | *your web framework* |
| Logging / structured events | *your logging library* |
| Frontend UI, forms, state | *your UI kit + form library* |
| HTTP calls, crypto, encoding, timers | **Web standard APIs** (`fetch`, `crypto.subtle`, `URL`, `TextEncoder`) |
| Storage / cache / queues | *your platform bindings or clients — no wrapper layers* |

If you're about to write a date parser, a validator, a query builder, a retry loop, or an auth check by hand, stop and check the table first.

## Adding a dependency (when the logic is complex)

The goal is to keep responsibility **out** of the codebase: every piece of
complex logic we hand-roll is one more thing to maintain, test, and
re-understand months later. When step 4 of the decision order fires,
actively look for a library before writing the logic — and hold it to this
bar before adopting:

- **Actively maintained** — recent releases, responsive issue tracker, not
  a one-person abandonware.
- **Widely adopted** — enough real-world usage that the edge cases are
  already found.
- **Fits the stack** — works on the production runtime, ships types, and
  doesn't drag a second framework in as a transitive dependency.
- **Focused** — solves this responsibility with a small API surface; prefer
  one good focused library over a kitchen-sink toolkit.

Guardrails: don't add a dependency for something trivial (a few lines the
platform or stack already covers — steps 1–2 win), and once a library is
picked, **add it to the stack table above** so every later change reuses the
same one instead of introducing a competitor.

The same logic applies one level up, to **infrastructure and services**
(AGENTS.md rule #0's stack bias): this project has one maintainer and no
ops team, so pick managed/serverless options that need no maintenance,
scale on their own, and are configured in minutes — never something that
must be provisioned, patched, monitored, or resized by hand.

## Avoid over-engineering

- **No speculative abstractions.** Don't add an interface, factory, generic, or config option for a second case that doesn't exist yet (YAGNI). Solve the case in front of you.
- **No premature layers.** Don't split a file into a subfolder, or a function into five, until size actually forces it.
- **No empty placeholders.** Don't scaffold files "for later."
- **Inline over indirection** until repetition (3+ real uses) justifies extracting.
- **Fewer options.** A function with one clear behavior beats one with five boolean flags.
- Prefer **plain data and pure functions** over classes/state when either works.

## Keep it readable

- **Descriptive names over comments.** A good name removes the need for a comment.
- **Small functions** with one job. If your linter's complexity rule fires, split and rename — don't annotate.
- **Direct control flow.** Early returns over nested conditionals; optional chaining over manual null checks.
- Match the surrounding code's idiom and altitude — don't introduce a new pattern for one call site.

## When complexity IS justified

Simplicity is the default, not a dogma. Add complexity only when a real, present requirement demands it — and when you do, make it obvious: a descriptive name, a one-line comment explaining the *why*, and a test that pins the behavior. A correct solution that's slightly longer beats a clever one that's hard to read.

## Quick self-check before committing

- Could a reader understand this without comments?
- Did I write anything the stack already provides?
- Did I hand-roll complex logic a well-maintained library already solves?
- Did I add an abstraction for a case that doesn't exist yet?
- Could this be fewer lines, fewer files, or fewer concepts without losing clarity?
