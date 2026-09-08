# Frontend and backend deltas

The `code-standard` rules apply everywhere. These are the few that only make
sense on one side of the wire. ⚙ marks what the build enforces.

## React and components

**Derive state; never mirror it with an effect that calls `setState`.**

```ts
// avoid
const [total, setTotal] = useState(0)
useEffect(() => { setTotal(sumCents(lines)) }, [lines])

// prefer
const total = sumCents(lines)
```

**Effects synchronize with the world outside React** — subscriptions, the DOM,
a non-React store. Computing a value is not synchronization.

**Keep JSX flat:** early return for loading and error states, never nested
ternaries. ⚙

**Anything longer than an expression gets a name above the `return`.**

**Callback props are `onX`; the functions bound to them are `handleX`.**

**Split a component when it stops fitting on a screen,** not in anticipation.

## Handlers, services and data access

**Validate once, at the boundary; pass typed values inward.** Re-validating
downstream is duplicated truth that will drift.

**Keep IO at the edges.** A function that both fetches and decides is hard to
test and hard to reuse.

```ts
// avoid
async function isOverBudget(teamId: string) {
  const team = await fetchTeam(teamId)
  return team.spentCents > team.budgetCents
}

// prefer
function isOverBudget(team: Team) { return team.spentCents > team.budgetCents }
```

**Never build a query by string concatenation; parameterize.**

**Errors crossing the wire lose their type** — serialize a shape the caller can
branch on, not a message it has to parse.
