---
name: guard
description: Blocking skill invoked by the PreToolUse hook on Write|Edit matching src/**. Validates rules before allowing writes — (a) enforced module file layout, (b) TDD reminder (advisory — injected as context, not hard-blocked; CI's test suite is the backstop), (c) forbidden runtime APIs in shipped code, (d) cross-domain edits blocked when the active task's domain differs from the target module. Returns decision:block with an instructive message when a rule is violated.
model: opus
---

# Skill: `guard`

Blocking skill. Fired by the `PreToolUse` hook on `Write|Edit` matching `src/**`. Validates 4 rules before allowing the write. The deterministic rules (a) and (c) are implemented in `hooks/guard.sh` — configure its two knobs (`MODULE_BASENAMES`, `FORBIDDEN_PATTERNS`) for your project. Rules (b) and (d) need judgment and are delegated to the agent via `additionalContext`.

## Input

The hook provides via stdin (JSON) the `file_path` and `content` of the operation.

## Validation rules (in order)

### (a) Module structure

If `file_path` matches `src/modules/<name>/(.+)\.tsx?$`:

- Allowed filenames: the layer basenames your project enforces (default: `validators.ts`, `models.ts`, `repositories.ts`, `services.ts`, `controllers.ts`, `errors.ts`), or `*.test.ts` (any prefix).
- Other names → **block** with a message that states the allowed set and reminds: one file per layer, no anticipated subfolders, no new layer names.

### (b) TDD (advisory reminder — CI is the hard backstop)

The PreToolUse hook does **not** hard-block on this; it injects a reminder via `additionalContext` (see `guard.sh`). The real enforcement is **CI**, which runs the test suite on every push/PR.

Tests live in the central `tests/` folder, **mirroring `src/`** — NOT co-located. When `file_path` is a behavior-bearing layer (services/repositories/controllers or your equivalent):

1. The matching test is `tests/<mirrored path>/<basename>.test.ts`. Create it FIRST with failing scenarios.
2. Watch it fail (test runner exits ≠ 0) before implementing.
3. Implement the minimal code to turn it green. CI will reject the push if the test is missing or red.

### (c) Runtime safety (forbidden APIs in `src/`)

If `file_path` is inside `src/` (excluding test files and any allowlisted infra files):

- Grep the `content` for the forbidden patterns configured in `guard.sh` — APIs that exist on the dev runtime but not in production (e.g. `bun:*` / `Bun.*` on edge runtimes, `fs`/`process` in browser bundles).
- If any match → **block** with a message naming the pattern and the sanctioned alternative (Web standard APIs, platform bindings).

### (d) Cross-domain

If there's an "active task" (read from the session context, e.g., the agent is executing a task/issue with `domain: Y`):

- If `file_path` belongs to module `X` with `X ≠ Y` → **block**:
  ```
  Blocked: active task has domain=Y; you tried to edit module X.
  Record a cross-domain blocker issue in Linear (owning domain X, blocking the active issue) and continue without crossing the boundary.
  ```

**Heuristic for detecting the "active task":** look for a recent reference in the session context to a Linear issue being executed. If no active task can be identified, this rule is skipped (does not block).

## Output

Print to stdout a JSON object:

```json
{ "decision": "allow" }
```

or

```json
{ "decision": "block", "reason": "<instructive message>" }
```

## Permissive by default

If no rule fires → `allow`. **Never** block arbitrarily; a blocking message must always instruct how to proceed.
