# Dependencies

**Read this before writing any logic that is not this product's own domain
rules, and before adding any package.** The bar below is not advisory: a
dependency that misses one line of it does not go in.

**Searching for a library is the default, not a step you may skip.** Before
writing any logic that is not this product's own domain rules, go look for
something that already owns it — dates and timezones, money and rounding,
parsing, diffing, retries and backoff, rate limiting, state machines, fuzzy
search, CSV, PDF, spreadsheets, cron expressions, slugs, IDs, validation,
crypto, auth, email, images, file handling. Assume the library exists, because
it almost always does.

**Writing it yourself is the exception and needs a reason in the code** — a
one-line comment saying which candidates you looked at and why none fit. "I did
not look" is not a reason.

Five minutes searching beats an hour writing, and every hand-rolled version of
a solved problem is a thing you maintain, test and re-understand alone, in the
gaps between other projects.

**Where to look, in order:** the framework's own ecosystem or plugin list →
the package registry sorted by real usage → what comparable projects on this
stack already depend on. Read the README and the last three releases before
adopting; never adopt from the name alone.

**Bar for a new dependency — all of it, not most:**

- **A commit in the last two years.** This is the maintenance check: a
  repository whose last commit is older than that is abandoned, whatever the
  README says. Check the commit history, not the release list — a stable
  library that still gets dependency bumps and issue answers passes.
- Adopted beyond its author: real dependents, issues opened by strangers.
- Runs on the production runtime, ships its own types, license MIT / Apache /
  BSD / ISC.
- Focused on this one responsibility. A kitchen-sink toolkit adopted for a
  single function is a no.
- A transitive tree you are willing to read, and no open advisory.

**When two candidates both clear the bar, take the more used one** and move on.
This choice does not deserve an afternoon.

**Reject it when** it saves a few lines the platform already covers, when the
last commit is older than two years, or when adopting it drags in a second
framework.

**Record the chosen one as a row in `AGENTS.md`'s capability table,** so the
next change reuses it instead of adding a competitor for the same job.

**Infrastructure follows rule #0 of `AGENTS.md`** — provisioned over
serverless while the project is small. Whether a whole responsibility should
leave the codebase for an external service is decided one step earlier, in
`design-and-patterns.md`.
