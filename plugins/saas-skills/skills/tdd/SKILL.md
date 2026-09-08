---
name: tdd
description: >-
  Apply whenever behavior-bearing code is written or changed — implementing a
  task issue, building a feature, fixing a bug, changing what existing code
  does. The failing test comes first, and every test traces back to something
  the task asked for. Defines what a good test is, where the seam goes, the
  red-green-refactor loop, and the mutation pass that proves the tests are
  worth having before the pull request opens. Load it before writing or
  changing a test, before the first line of a fix, when deciding what to mock
  or stub, when a test passes on its very first run, and when judging whether
  the coverage on a diff is real.
---

# Skill: `tdd`

The failing test comes first, everywhere. This skill is what that test looks
like, where the seam goes, and how the tests are **proven** to be worth having
before the work is called done.

Tests live in `tests/`, mirroring `src/` — not co-located.

---

## The test comes from the task, not from the code

**Every test traces to something the task asked for.** The issue's `tests:`
scenarios are the list; each one becomes a test. A test you cannot trace back
to a line of the issue is either a missing acceptance criterion — add it to the
issue — or scope you invented.

**Write it before the implementation exists.** A test written afterwards
describes the code instead of the requirement, which is the tautological trap
below and the reason after-the-fact tests pass so easily.

**A scenario the issue does not state is not yours to assume.** Ask, in one
`AskUserQuestion` turn, and put the answer in the issue before testing it.

**Bug fixes follow the same rule:** a failing regression test that reproduces
the reported behavior at the nearest seam, then the fix that turns it green. No
fix ships without its regression test.

---

## What a good test is

**It verifies behavior through a public interface** — what the module promises,
never how it does it.

**It reads like a specification:** the name and the assertions describe the
scenario in domain language.

**It survives refactors.** Renaming internals, extracting a function or
swapping a data structure must not break it while behavior is unchanged.

---

## Seams — decided before the first test

A seam is the boundary where behavior is observable: an exported service
function, an HTTP handler, a CLI command.

**Test at the highest seam that is practical.** The ideal number of seams per
feature is one.

**Derive the seam from the issue's `provides` and `scope`.** If it is
ambiguous, settle it with the operator in one question, before the first test.

**Mock only at system boundaries** — network, clock, third-party APIs. Never
your own modules: needing to mock your own code means the seam is wrong.

---

## The loop

1. Write **one** failing test for the next scenario, and **watch it fail** —
   the runner exits non-zero, for the reason you expect.
2. Write the **minimal** code that turns it green (`code-standard` owns what
   that code looks like).
3. Refactor only while green, then take the next scenario.

**One slice at a time.** All the tests up front and then all the
implementation is horizontal slicing: it hides integration mistakes until the
end, when they are most expensive.

---

## Proving the tests are worth having

Green is not evidence. A test that passes whether or not the code works is
worse than no test — it buys confidence and blocks nothing.

**When the loop is green, a review agent verifies the tests by breaking the
code.** The implementation agent runs it as a separate pass, so the assertions
are checked by someone other than their author. It is not optional and the
author does not self-certify it.

For each test:

1. Change the implementation so the behavior that test claims to pin is
   actually wrong — flip a comparison, drop a branch, return a constant.
2. Run the suite.
3. Restore the code. **The mutation is never committed.**

Read the result:

| What happened | What it means |
|---|---|
| That test failed, and only it | The test is real. Move on. |
| The test stayed green | The test is invalid — it does not observe the behavior it claims. Fix the test, never the mutation. |
| Half the suite went red from one mutation | The tests are coupled to the implementation, or the seam is too low. |
| Nothing to mutate — the code has no branch the test cares about | The test is asserting a constant. Re-derive it from the issue. |

The pull request reports which tests were mutated and what happened.

---

## Anti-patterns

| Anti-pattern | The tell |
|---|---|
| Implementation-coupled test | Breaks on a refactor although behavior is unchanged |
| Tautological test | The assertion recomputes the expected value the way the code does |
| Horizontal slicing | All tests written first, then all implementation |
| Self-mocking | A mock of a module that lives in this repository |
| Test written after the code | It passed the first time it ran |

```ts
// avoid — tautological: mirrors the implementation, proves nothing
expect(fee(order)).toBe(order.total * 0.1)

// prefer — a specification: pins observable behavior with a concrete case
expect(fee({ total: 200 })).toBe(20)
```
