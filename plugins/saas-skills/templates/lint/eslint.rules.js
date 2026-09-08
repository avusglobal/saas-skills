// The `code-standard` rules that a linter can decide on its own.
//
// This is a FRAGMENT, not a config: merge `codeSimplicityRules` into the
// project's existing flat config rather than replacing it.
//
// Packages: typescript-eslint, eslint-plugin-unicorn, eslint-plugin-promise,
// eslint-plugin-sonarjs, @eslint-community/eslint-plugin-eslint-comments
// (registered below under the `eslint-comments` prefix), plus
// eslint-plugin-react and eslint-plugin-react-hooks on a React project.
//
// The rules marked "type-aware" need `parserOptions.projectService` (or
// `project`) — without it typescript-eslint silently does not apply them.
//
// Verify every rule name against the versions the project actually installs
// before writing this in. A config that fails to load is worse than a smaller
// one: drop what does not resolve and report it as uncovered.

export const codeSimplicityRules = {
  // Thresholds
  "max-depth": ["error", 2],
  "max-params": ["error", 3],
  complexity: ["warn", 15],

  // Function shape
  "no-param-reassign": ["error", { props: true }],
  "no-else-return": ["error", { allowElseIf: false }],

  // Name your conditions — this selector fires at three clauses (`a && b && c`),
  // not two, because a two-clause condition is too common to block on. The
  // two-clause half of the rule stays a review call.
  "no-restricted-syntax": [
    "warn",
    {
      selector: "IfStatement > LogicalExpression > LogicalExpression",
      message:
        "code-standard: a condition with three or more clauses gets a named boolean.",
    },
  ],
  "no-negated-condition": "warn",

  // Comments
  "sonarjs/no-commented-code": "error",
  "unicorn/expiring-todo-comments": [
    "error",
    { ignoreDatesOnPullRequests: true, allowWarningComments: false },
  ],

  // Errors, types and async
  "no-empty": ["error", { allowEmptyCatch: false }],
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-non-null-assertion": "error",
  "@typescript-eslint/no-useless-catch": "error",
  "@typescript-eslint/require-await": "error", // type-aware
  "promise/prefer-await-to-then": "error",
  "unicorn/error-message": "error",

  // Tie-breakers
  "unicorn/no-null": "error",
  "@typescript-eslint/no-floating-promises": ["error", { ignoreVoid: true }], // type-aware
  "no-await-in-loop": "error", // the disable comment is where the reason goes

  // The complexity rule is not something to annotate your way past
  "eslint-comments/no-restricted-disable": ["error", "complexity", "max-depth"],
  "eslint-comments/require-description": ["error", { ignore: [] }],

  // Names — partial by nature: a linter can check shape, never meaning
  "@typescript-eslint/naming-convention": [
    "warn",
    { selector: "interface", format: ["PascalCase"], custom: { regex: "^I[A-Z]", match: false } },
    { selector: "typeAlias", format: ["PascalCase"], custom: { regex: "^T[A-Z]", match: false } },
    {
      selector: "variable",
      types: ["boolean"], // type-aware
      format: ["PascalCase"],
      prefix: ["is", "has", "can", "should", "will", "did"],
    },
    {
      selector: ["variable", "parameter", "function"],
      format: ["camelCase"],
      custom: {
        regex: "^(data|info|item|value|result|handler|manager|helper|utils|tmp|temp|obj|arr|val)$",
        match: false,
      },
    },
  ],
}

// React projects only.
export const codeSimplicityReactRules = {
  "no-nested-ternary": "error",
  "react-hooks/exhaustive-deps": "error",
  "react/jsx-handler-names": [
    "warn",
    { eventHandlerPrefix: "handle", eventHandlerPropPrefix: "on" },
  ],
}
