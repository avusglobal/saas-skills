---
name: tdd
description: The TDD methodology for all behavior-bearing code. Use when implementing a Linear task issue, building a feature or fixing a bug test-first, or whenever red-green-refactor, test scenarios, or the tests section of an issue body are involved.
---

# Skill: `tdd`

The kit mandates the failing test first everywhere; this skill defines what
that test should look like and how the loop runs. Tests live in the central
`tests/` folder, **mirroring `src/`** — not co-located.

## What a good test is

- Verifies **behavior through a public interface** (a seam) — what the
  module promises, not how it does it.
- **Reads like a specification**: the test name + assertions describe the
  scenario in domain language.
- **Survives refactors**: renaming internals, extracting functions, or
  swapping data structures must not break it while behavior is unchanged.

## Seams — decide where to test before writing anything

A seam is the boundary where behavior is observable: an exported service
function, an HTTP handler, a CLI command. Rules:

- Test at the **highest seam practical**; the ideal number of seams per
  feature is **one**.
- Derive the seam from the issue's `provides` and `scope` fields. If it is
  ambiguous, agree it with the operator in **one** `AskUserQuestion` turn
  ("What's the public interface, and which seam should we test?") before the
  first test.
- Mock **only at system boundaries** (network, clock, third-party APIs) —
  never your own modules; if you need to mock your own code, the seam is
  wrong.

## The loop

1. Write **one** failing test for the next `tests:` scenario — and **watch
   it fail** (runner exits ≠ 0) for the reason you expect.
2. Write the **minimal** code to turn it green (see `simplicity`).
3. Refactor only while green, then go to 1 with the next scenario.

One slice at a time. Never write all the tests up front and then all the
implementation — that is horizontal slicing and it hides integration
mistakes until the end.

## Anti-patterns — each with its tell

| Anti-pattern | The tell |
|---|---|
| Implementation-coupled test | Breaks on a refactor although behavior is unchanged |
| Tautological test | The assertion recomputes the expected value the same way the code does |
| Horizontal slicing | All tests written first, then all implementation |
| Self-mocking | A mock of a module that lives in this repo |

Example — the same rule, tested two ways:

```ts
// BAD (tautological): mirrors the implementation, proves nothing
expect(fee(order)).toBe(order.total * 0.1);

// GOOD (specification): pins observable behavior with a concrete case
expect(fee({ total: 200 })).toBe(20);
```

## Bug fixes are TDD too

A bug fix starts with a **failing regression test** that reproduces the bug
at the nearest seam — then the fix turns it green. No fix ships without its
regression test.
