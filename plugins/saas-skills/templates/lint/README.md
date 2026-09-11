# Making `code-standard` enforceable

The skill states about sixty rules. A linter can decide sixteen of them on its
own, and those stop being review comments and become build failures. This
directory holds the fragments `/saas-skills:setup` merges into a project, and
the table below is the honest accounting of what each tool covers.

| Skill rule | ESLint | Biome |
|---|---|---|
| Nesting ≤ 2 levels | `max-depth` | — |
| Positional parameters ≤ 3 | `max-params` | — |
| Never mutate an argument | `no-param-reassign` (`props: true`) | `style/noParameterAssign` |
| Don't annotate past the complexity rule | `eslint-comments/no-restricted-disable` | — |
| No commented-out code | `sonarjs/no-commented-code` | — |
| `TODO` only with an issue reference | `unicorn/expiring-todo-comments` | — |
| Never swallow: no empty `catch` | `no-empty` (`allowEmptyCatch: false`) | `suspicious/noEmptyBlockStatements` |
| Catch only what you can handle | `@typescript-eslint/no-useless-catch` | `complexity/noUselessCatch` |
| Narrow a caught `unknown` | `useUnknownInCatchVariables` (tsconfig) | same — tsconfig |
| No `any` | `@typescript-eslint/no-explicit-any` | `suspicious/noExplicitAny` |
| No `!` | `@typescript-eslint/no-non-null-assertion` | `style/noNonNullAssertion` |
| No `async` without an `await` | `@typescript-eslint/require-await` | `suspicious/useAwait` |
| No `.then()` mixed with `await` | `promise/prefer-await-to-then` | — |
| Absent value is `undefined` | `unicorn/no-null` | — |
| `await` by default; `void` marks fire-and-forget | `@typescript-eslint/no-floating-promises` (`ignoreVoid`) | `suspicious/noFloatingPromises` (Biome 2+) |
| A sequential loop needs a stated reason | `no-await-in-loop` | — |

Partial, by nature — a linter checks shape, never meaning:

| Skill rule | How far it goes |
|---|---|
| Name your conditions | Fires at three clauses, not two — two-clause conditions are too common to block on. |
| Prefer the positive form | `no-negated-condition` only catches `if (!x) … else`. |
| Booleans read as predicates | `naming-convention` enforces the prefix on typed booleans only. |
| No type prefixes | Catches `IUser` and `TProps`; cannot judge a bad name that is well-formed. |
| No filler nouns | An exact-word list — `data` is caught, `orderData` is not. |
| No nested ternary in JSX | `no-nested-ternary` applies everywhere, not just JSX. |
| Effects synchronize | `react-hooks/exhaustive-deps` catches stale deps, not a misplaced effect. |
| Callback props are `onX` | `react/jsx-handler-names`. |

**Everything else — roughly thirty-four rules — is judgment and stays with the
`simplify` agent and the reviewers inside `/saas-skills:implement`.** Whether a dependency already does
this, whether an abstraction earns its keep, whether a name says what the thing
is, whether a comment explains an invisible *why*, whether a failure is
expected or unexpected, whether a type is derived or mirrored. No linter
decides those, and pretending otherwise is how a rule set gets ignored.

## On a Biome project

Biome covers eight of the sixteen. `max-depth`, `max-params`,
`no-await-in-loop`, `unicorn/no-null`, `promise/prefer-await-to-then`,
commented-out code, the `TODO` format and restricted disables have no
equivalent. Say so in the install report — the adopter needs to know those
eight stayed review-only, not that they are covered.

## Files

| File | Merge into |
|---|---|
| `eslint.rules.js` | the project's flat config (`codeSimplicityRules`, plus `codeSimplicityReactRules` on React) |
| `biome.rules.json` | `biome.json` |
| `tsconfig.compilerOptions.json` | `tsconfig.json` |

The type-aware ESLint rules need `parserOptions.projectService`; without it
typescript-eslint drops them silently. Run the linter once after writing, on
the real source tree, and fix or drop what does not resolve.
