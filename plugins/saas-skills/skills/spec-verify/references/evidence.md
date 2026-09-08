# Evidence rules (Part 1 — reading, always)

For each `AC-n` criterion in the issue text:

1. **Find the test that proves it.** Look in the test files from the diff
   and, when needed, the whole suite. Cite `file:line` and the assertion
   expression, and state the value the spec defined that it verifies. No
   `file:line` ⇒ not covered — evidence or zero. Search before declaring a
   gap; never assume absence without grepping.

2. **Flag shallow tests.** A test with no assertion at all; `expect(true)`;
   "no error thrown" as the only assertion when the spec describes a specific
   behavior; an assertion that only checks that a mock was called when the
   criterion requires a persisted value or state. The payload rule: a
   `save(...)` call does not prove the field — only an assertion on the
   result does.

3. **Flag tests that map to no criterion**, edge case or step in the issue.
   Those are scope creep: recommend removal. They do not count toward the
   verdict.

4. **Build the table** — criterion → evidence → outcome (✅ covered,
   ❌ gap, ⚠️ criterion too vague to verify).

## Criteria that are most often faked

Hold these to a higher evidence bar. A criterion about one of them that is
"covered" by a test asserting only that a function ran is a **shallow test**,
not coverage.

- **An amount.** The assertion pins the number *and* its currency, and the
  currency is the one the case defines, not a default. `total === 4990` with
  no currency assertion proves nothing about a buyer in another country.
- **A state transition driven by an external event.** The assertion is on the
  persisted state after the event, and there is a second test for the same
  event delivered twice. A criterion about confirming something with no
  redelivery test is a gap, even when the issue did not spell it out.
- **Anything per locale or per market.** The assertion names the exact locale
  (`es-CO`, not `es`), and a criterion covering more than one needs evidence
  per one — not a single parameterized test that only ever runs the first
  case.
- **Access to a resource.** The assertion shows the negative case: the wrong
  id, the expired record, the deleted record. "Returns it for the right id"
  alone is half a criterion.

The project may add its own list under `delivery.riskDomains` in
`.claude/saas-skills.json`. Read it and hold those to the same bar.
