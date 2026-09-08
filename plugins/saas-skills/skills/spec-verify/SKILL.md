---
name: spec-verify
description: >-
  The procedure the `spec-verifier` agent follows — checking that every
  acceptance criterion has real test evidence and, when the diff touches
  application source, injecting behavior faults to confirm the tests actually
  discriminate. Load when acting as the `spec-verifier` agent, and only then —
  outside that agent the same question belongs to the `tdd` skill's mutation
  pass.
---

# Skill: `spec-verify`

Loaded by the `spec-verifier` agent, reviewing whether a completed PR proves
its acceptance criteria (`AC-n`) with real test evidence.

## Getting the diff

```bash
cd <worktree>
git fetch origin <BASE>
base=$(git merge-base "origin/<BASE>" HEAD)
git diff "$base"..HEAD
```

If the worktree path does not work, fall back to `gh pr diff <url>` — Part 2
does not run then, and the report says "sensor not run: no local worktree".

## Part 1 — reading (always)

For each `AC-n`: find `file:line` evidence, flag shallow tests and
scope-creep tests, and build the criterion → evidence → outcome table. Full
rules: [references/evidence.md](references/evidence.md).

## Part 2 — fault injection

Only when the diff touches application source; a 90-second test-time budget
and at most two faults. Disposable worktree, pick the risky lines, mutate,
run the covering test, read kill or survive, clean up. Full procedure:
[references/fault-injection.md](references/fault-injection.md).

## Verdict

`REJECTED <n>` where `n` = (criteria with no evidence) + (shallow tests over
specified behavior) + (surviving faults with a justified file choice).

Tests with no matching criterion, and criteria whose wording is too vague to
verify (⚠️), are listed in the report but **do not count** toward `n`.

## Report format

```
## 📋 Spec verification — `<short-base>..<short-head>`

**Verdict:** 📋 <N> finding(s) — or — ✅ All criteria covered

| Criterion | Evidence | Outcome |
|---|---|---|
| AC-1 | `tests/checkout.test.ts:42` — `expect(charge.currency).toBe("MXN")` | ✅ covered |
| AC-2 | — | ❌ gap |

**Fault injection:** <one or two sentences — how many faults, how many died
and how many survived — or "sensor not run: <reason>" / "not applicable:
diff does not touch application source">
```

If there are findings that count toward `n`, add a numbered section per
finding: title plus `AC-n`, what is missing, the evidence, how to fix it.
Tests with no matching criterion and vague criteria go in a separate **Out of
the verdict** section, with no finding number. No findings ⇒ a short **What
was checked** section with three to six bullets instead.
