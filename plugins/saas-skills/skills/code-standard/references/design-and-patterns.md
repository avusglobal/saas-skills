# Design and patterns

**Read this before writing, whenever the change spans more than one function**
— a new module, a feature with several moving parts, a refactor that moves
boundaries, or a third place that just grew the same branch. For a single
function, a bug fix or a copy change, skip it.

This is the step that decides the *shape*; the skill body decides how that
shape is written, and its rules win over anything settled here.

**The step ends when you can answer these in a sentence each:**

- What are the responsibilities here, named as verbs — and which of them could
  leave the codebase entirely?
- Which of them change for different reasons, and at whose request?
- What does this depend on that is slow, external, or likely to be swapped?
- What is the smallest arrangement that answers the above?

If those answers are obvious, the design is *one function in one file*. Say so
out loud and move on — that is a finished design, not a skipped step.

---

## First: does this belong in the codebase at all?

The cheapest module is the one never written. Before designing a subsystem,
check whether an existing service or tool deletes it outright — auth and
sessions, email delivery, search, queues and schedulers, cron, feature flags,
file conversion, PDF generation, image processing, analytics, error tracking,
payments. Each of those is somebody's whole product; a hand-built version is a
second product you maintain alone, forever, in the gaps between other projects.

**Stack bias (AGENTS.md rule #0):** managed and auto-scaling over anything that
must be provisioned, patched, monitored or resized by hand. There is no ops
team, so a service that needs a machine kept alive is a no unless an ADR argues
the case.

**Take the external option when** it covers the responsibility whole, its
failure mode is visible (a status page, an alert you receive), its pricing at
your real volume is known, and leaving it later means rewriting one module
rather than the application.

**Build it when** the thing *is* the product, when the integration would cost
more than the feature, when the data cannot leave, or when every candidate
needs you to run it.

The same question one level down — a library instead of a module, rather than a
service instead of a subsystem — belongs to the skill body, along with the
bar a dependency has to clear.

---

## SOLID — which letters change a decision here

Two of the five earn their keep in a codebase with one maintainer. The other
three get cited to justify things this project does not build. No definitions
below, only this project's stance.

**SRP — the one that pays.** "One reason to change" is a question about *who
asks for the change*, never about line count. Billing rules and invoice layout
change for different people: two modules. A function that merely got long is
still one responsibility — leave it.

**DIP — at the boundary, nowhere else.** Invert only the dependencies you will
actually swap or fake: the clock, randomness, the network, the payment
provider, the queue, the file store. Everything else calls the library
directly.

```ts
// prefer — the seam exists because the test needs it
function expireTrial(customer: Customer, now: Date) { ... }

// avoid — an interface around an ORM you will never replace
interface UserRepository { findById(id: string): Promise<User> }
```

**OCP — usually a trap here.** "Closed for modification" is a promise about
code you cannot edit. You own the whole repository: editing the switch is
cheaper than the registry that exists to avoid editing the switch. It pays only
where the extension point crosses a boundary you do not control — a provider
that keeps adding webhook event types.

**LSP — comes free from discriminated unions.** There is almost no inheritance
here. The version that does bite: if one variant of a union forces the caller
to know *which* variant it got, the union is drawn wrong.

**ISP — collapses into SRP for a single maintainer.** A fat interface with one
implementation is not a segregation problem; it is an interface that should not
have been written.

---

## Design patterns

The catalog is a **vocabulary for shapes you arrive at**, not a menu you order
from. A pattern applied to a pressure you do not feel yet is exactly the
speculative abstraction the skill body bans.

**A pattern is allowed when all three hold:**

1. The pressure exists **today**, in code you can point at.
2. The pattern is the *smallest* thing that relieves it — a function is almost
   always smaller.
3. You can call it by its name in the code, so the next reader recognizes the
   standard shape instead of decoding a bespoke one.

| Pressure you actually feel | Reach for this first | Pattern only when |
|---|---|---|
| The same `if (type === …)` in three places | one function that maps type → behavior | the branches grow their own state — then Strategy |
| Building a thing takes five decisions | a function with a named-object parameter | construction varies by input *and* happens in several places — then Factory |
| Something must react when this changes | call it directly | the producer must not know its consumers, across a module or process — then events |
| An external API is awkward or unstable | one adapter module at the boundary | always fine — this is DIP at the edge |
| A long multi-step operation | named functions, called in sequence | the steps are configurable at runtime — then a pipeline |
| State threaded through many calls | pass it as a parameter | the parameter list passes three — then a context object |

**Not used in this codebase**, unless an ADR argues the case: Singleton (a
module already is one, and it hides state that tests then cannot reset),
inheritance deeper than one level, an abstract base with a single subclass, a
generic `manager` / `engine` / `framework` layer invented in-repo, and DI
containers.

---

## Boundaries

**Things that change together live together.** Proximity in the tree should
predict co-editing.

**A module you cannot describe without "and also" is two modules.**

**Imports cross a boundary in one direction.** If they cross both ways, the
boundary is in the wrong place — that is the finding, not the workaround.

**Data flows down, events flow up.** A lower layer that reaches back up into
its caller is the same mistake with a different shape.

**The default layout is package by feature** — one directory per subdomain,
its entity, service, repository and controller together. Layers as top-level
directories — `controllers/`, `services/`, `repositories/` — are not used here.

**A `features/` directory exists only next to a `domain/`** that holds the one
definition of the entity. A use-case directory carrying its own copy of an
entity is the finding.

**Modules talk through a public entry point or an event**, never through each
other's internals and never by sharing an entity.

**`shared/` holds technical capability and no business rule.** A rule two
domains both need means the boundary is drawn in the wrong place.

When to leave the default is measured in `/spec`, not argued while writing.

---

## Writing the decision down

A shape decision survives the session only if it is recorded. Write an ADR in
`docs/adrs/` when the decision constrains code that does not exist yet, when it
was genuinely contested, or when reversing it would touch several modules.
Otherwise the names in the code are the record, and that is enough.

---

## Handing off

Once the shape is settled, the skill body owns everything about how it is
written — thresholds, names, comments, errors, async — and **its bans are not
overridden by anything decided here.** A design that needs a speculative
interface, a wrapper around a single call site, or a class holding state you
could have passed as an argument did not pass step 2 above.

## Before writing

- Does any of this already exist as a service, a tool or a library — and did I
  actually go look, or just assume?
- Can I name each responsibility as a verb, and does each change for a
  different reason?
- Is this pattern here because the pressure exists today, or because it looks
  professional?
- Which dependency will I fake in a test? Is that the only seam I inverted?
- Would a plain function do what this whole arrangement does?
- If I deleted the abstraction, how much worse is it — honestly?
