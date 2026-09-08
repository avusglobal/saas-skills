---
name: code-standard
description: Apply before writing, refactoring or reviewing any application code — before the first line and again before committing. This project's complete code standard, covering the numeric thresholds, naming, comments, and the settled tie-breakers for absent values, expected failures, types and async. Routes to the design step when the change spans more than one function, to the dependency bar before any package or non-domain logic is written, and to the frontend and backend deltas.
---

# Skill: `code-standard`

The bar for every line: **simple to write now, simple to re-understand two
months from now.** One maintainer, several projects, long gaps between
sessions — optimize for the second read, not the first write.

Every rule stands on its own line so a review can point at exactly one. An
example appears only where the rule has a shape that is easy to get wrong.

**⚙ marks a rule the build already enforces** — the lint and `tsconfig`
configuration `/saas-skills:setup` writes. Those sixteen are stated here so the
standard is complete in one place, not so you check them by hand; a violation
is a failed build, not a review comment. Everything unmarked is judgment, and
the readability workflow and the reviewer are its backstop.

---

## Read first, when the row matches

These are conditions, not suggestions. Check every row before the first line of
code, and act on the ones that match — all of them, in this order.

| If | Then, before writing |
|---|---|
| **The code changes behavior** — anything but a rename, a comment or a copy change | **Load the `tdd` skill.** The failing test comes first; this page only governs the code that turns it green. |
| The change spans more than one function — a new module, a feature with several moving parts, a refactor that moves boundaries | Read [`references/design-and-patterns.md`](references/design-and-patterns.md) |
| You are about to add a package, or to write logic that is not this product's own domain rules | Read [`references/dependencies.md`](references/dependencies.md) |
| You are writing a React component, a handler, a service or data access | Read [`references/frontend-and-backend.md`](references/frontend-and-backend.md) |

The rules in this file apply either way, and they win: a design that needs a
speculative interface or a wrapper for one call site does not survive contact
with this page.

**Scope:** how code is written. Where it physically lives — folders, modules,
layers — is the module layout section of `AGENTS.md`.

---

## Before writing: does this code need to exist?

First hit wins: **stack dependency → platform API → something already in this
repo → a maintained library → write the minimum that satisfies the failing
test.**

**Read the capability table in `AGENTS.md` before hand-rolling anything.** It
maps each capability — auth and sessions, schema and queries, validation,
routing, logging, UI and forms, storage, cache and queues, and everything the
project has needed since — to the one thing this project uses for it. If you
are about to write a date parser, a validator, a query builder, a retry loop or
an auth check by hand, that table is the stop sign.

"Platform API" means what the runtime already ships — `fetch`, `crypto.subtle`,
`URL`, `TextEncoder`, `Intl`, `structuredClone`. Pulling a package to do one of
those is how a dependency list stops being readable.

**Anything past that chain — searching, the adoption bar, what disqualifies a
package — is in [`references/dependencies.md`](references/dependencies.md).**

---

## Thresholds

| Rule | Limit | |
|---|---|---|
| Nesting inside a function | 2 levels — deeper, invert or return early | ⚙ |
| Positional parameters | 3 — beyond that, a named object | ⚙ |
| Uses before extracting | 3 real ones — fewer, inline it | |
| Boolean parameters that switch behavior | never — two functions, or a named union | |
| Implementations before an abstraction | 2 — the seam waits for the second one | |

---

---

## Don't build for a future that hasn't arrived

**No speculative abstraction, interface, generic or config option** for a case
that does not exist yet.

**No premature layers, and no wrapper around a library you call from one
place.**

```ts
// avoid
export const db = { findUser: (id: string) => prisma.user.findUnique({ where: { id } }) }

// prefer — call the library where you need it
const user = await prisma.user.findUnique({ where: { id } })
```

**No scaffolding "for later"** — empty files are debt with no asset behind them.

**One clear behavior beats five boolean flags.**

**Plain data and pure functions over classes and held state,** when either works.

**Match the surrounding idiom and altitude** — no new pattern for one call
site, and no helper pitched a level below everything around it.

---

---

## Names

**Length is never a reason to shorten.** A long clear name has never cost
anyone time; a short one that must be decoded costs it on every read.

```ts
// avoid
if (n > l) { ... }

// prefer
if (invoicesThisMonth > monthlyInvoiceLimit) { ... }
```

**Plain words only** — no internal slang, no abbreviation you would have to
expand out loud, no word chosen for elegance.

```ts
// avoid
const txnAggr = computeAggr(entries)

// prefer
const totalPerCustomer = sumByCustomer(entries)
```

**Say what it is, not what type it holds** — `users`, not `userArray`.

**Booleans read as predicates** — `isActive`, `hasAccess`, `canEdit`. Never
`flag`, never a boolean called `status`.

**Verbs are honest about cost** — `getUser` is a cheap lookup, `fetchUser`
crosses the network, `buildInvoice` has no side effects.

**One concept, one word across the codebase** — `customer` here is never
`client` there.

**No filler nouns standing alone** — `data`, `info`, `item`, `value`,
`result`, `handler`, `manager`, `helper`, `utils`.

**No type prefixes or suffixes** — not `IUser`, not `UserInterface`, not
`TProps`.

**Abbreviate only what everyone expands instantly** — `id`, `req`, `res`,
`db`, `url`.

---

---

## Name your conditions

**Two or more clauses gets a name.** This is the first move whenever you feel
the urge to write a comment, and it applies to `filter`, `find` and ternaries
as much as to `if`.

```ts
// avoid — the comment exists only because the condition is unreadable
// only paying customers past their trial can export
if (c.plan !== "free" && c.trialEndsAt === null && !c.isLocked) { ... }

// prefer — the name cannot go stale
const isPayingCustomer = customer.plan !== "free" && customer.trialEndsAt === null
const canExport = isPayingCustomer && !customer.isLocked

if (canExport) { ... }
```

**Prefer the positive form** — `!isNotDeleted` is where readers get lost.

---

---

## Function shape and control flow

**One job per function;** if describing it needs an "and", it is two.

**Guard clauses first, happy path last and unindented.**

**Return values; never mutate an argument.** ⚙

**Extract for a name, not for tidiness.** A single-use block extracted only to
shorten its parent adds a jump and explains nothing.

**Public thing first, helpers below it.**

**If the linter's complexity rule fires, split and rename** — never annotate
your way past it. ⚙

---

---

## Comments

In order: **rename the variable → name the condition → split the function →
only then write a comment.** A comment is what is left when none of those can
carry the meaning.

**Comment the why, never the what.** One restating the code is worse than none
— it rots, and the next reader trusts it.

```ts
// Stripe rounds half-up, our ledger rounds half-even. Matching Stripe here
// keeps reconciliation from drifting by a cent per refund.
const refundCents = Math.round(amount * 100)
```

**Comment when the reason is invisible:** a spec or legal requirement, an
upstream API quirk, a race, a deliberate deviation, a measured trade-off.

**A workaround states what must change upstream for it to go away.**

**No commented-out code.** ⚙

**`TODO` only with an issue reference** — `TODO(TSK-142):`. ⚙

**JSDoc only where the contract, units or failure modes need stating** — never
a block restating each parameter name.

---

---

## Errors, types and async

**Never swallow:** no empty `catch`, no `catch { return null }`. ⚙

**Catch only what you can handle here;** let the rest propagate to the
boundary that logs it once. ⚙

**Throw with context** — name the operation and the identifier that reproduces
it.

**Narrow a caught `unknown`** before reading anything off it. ⚙

**No `any`** ⚙ — use `unknown` and narrow. An unavoidable escape hatch is one
`as` with a one-line why.

**No `!` to silence the compiler;** it moves the crash to runtime. ⚙

**No `async` without an `await` inside,** and never `.then()` chains mixed
with `await` in one function. ⚙

---

---

## Tie-breakers this project has settled

Both sides of each of these are defensible. The project picked one — follow it
rather than re-deciding per file.

**Absent value is `undefined`.** ⚙ Accept `null` only where a database or
external API forces it, and convert at that boundary instead of letting both
spread inward.

**Expected failures are return values; unexpected failures are thrown.**
Validation, not-found and permission denied are part of the contract. A
database being unreachable is not.

```ts
type ChargeResult =
  | { ok: true; receipt: Receipt }
  | { ok: false; reason: "card_declined" | "no_payment_method" }
```

**Types are derived, never mirrored.** `z.infer`, `typeof`, `ReturnType`,
indexed access — a hand-written shape next to a schema has already drifted.

```ts
const orderSchema = z.object({ id: z.string(), totalCents: z.number() })
type Order = z.infer<typeof orderSchema>
```

**Discriminated unions over optional-field soup.** Four optionals with two
legal combinations should be two variants with a tag.

```ts
// avoid
type Job = { state: string; startedAt?: Date; finishedAt?: Date; error?: string }

// prefer
type Job =
  | { state: "running"; startedAt: Date }
  | { state: "failed"; startedAt: Date; error: string }
```

**`await` by default.** ⚙ Mark an intentional fire-and-forget with `void` and
a `.catch`, so it reads as a decision rather than an oversight.

```ts
void sendWelcomeEmail(user).catch((error) => logger.error("welcome_email.failed", { error }))
```

**A sequential loop over independent work needs a stated reason** ⚙ — order, a
rate limit, or fail-fast. The `no-await-in-loop` disable comment is where that
reason goes; otherwise `Promise.all`.

---

---

## When complexity is justified

Simplicity is the default, not a dogma. When a real, present requirement needs
complexity, make it obvious: a descriptive name, one comment explaining the
why, and a test pinning the behavior. **A correct solution that is slightly
longer beats a clever one that is hard to read.**

---

---

## Before committing

- Could a reader understand this without the comments?
- Any condition with two or more clauses still without a name?
- Any name a newcomer would have to look up?
- Anything written here that the stack or the platform already provides?
- Any complex logic hand-rolled without looking for a library that owns it?
- Any abstraction, option or layer for a case that does not exist yet?
- Any swallowed error, floating promise, `any` or `!` I talked myself into?
- Could this be fewer lines, fewer files or fewer concepts without losing
  clarity?
