# Fault injection procedure (Part 2)

Runs only when the diff touches application source. Budget: 90 seconds of
test time, at most two faults. When the diff touches no application source,
skip this whole part and say so in the report — that is expected, not a
problem.

1. **Record** `git status --porcelain` of the child worktree. It must be
   identical when you finish.

2. **Create a disposable copy:** `git worktree add <scratch> HEAD` inside the
   scratchpad or `$TMPDIR`, then install dependencies inside it with the
   project's own install command. **Never** symlink or reuse the original
   dependency directory — a workspace link points back at the real,
   unmutated tree. If the install fails, skip the rest of Part 2 and report
   **"sensor not run: install failed"**. That never counts toward REJECTED.

3. **Pick one or two lines** of new or changed production code with the
   highest risk, guided by `AGENTS.md` and by the project's
   `delivery.riskDomains`. Highest-yield targets in most products:

   - the amount or the currency on a charge — swap the constant, multiply by
     100, drop a conversion;
   - a guard against reprocessing an external event — invert the "already
     processed" check so a redelivery is handled twice;
   - the gate that unlocks access after a condition — invert it, so the
     unconfirmed case passes;
   - access control — drop the expiry check, drop the deleted-record filter;
   - locale or tenant resolution — return the fallback unconditionally.

   Apply **one behavior fault per line** in the disposable copy: invert a
   condition, swap a return value, an off-by-one, remove a required side
   effect.

4. **Run the covering test.** Find the test files that import the mutated
   line's module, pick the fastest, and run it alone with the project's test
   command, wrapped in a timeout. Tests that boot a real database are slow —
   never run two at once.

5. **Read the result.** A dead fault (the test fails) is good and is not a
   finding. A surviving fault (the test still passes) means the test that
   should cover that line is weak: report it as a gap, with the exact
   mutation applied. A surviving fault against the wrong test file is not a
   gap — justify in the report why that file was chosen as the coverage
   candidate.

6. **Clean up:** `git worktree remove --force <scratch>`, then re-check that
   `git status --porcelain` of the original worktree matches step 1.

7. **If the budget is exceeded,** stop injecting and report **"sensor
   incomplete: budget exceeded"**. That never blocks the verdict.
