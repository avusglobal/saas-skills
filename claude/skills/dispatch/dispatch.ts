#!/usr/bin/env bun
/**
 * dispatch.ts — orchestrate one Claude agent per task of a change, via cmux.
 *
 * Each *change* runs in its own git worktree on branch `dispatch/<change>` and gets its own cmux
 * *workspace* (the single screen) plus a side "Code" *tab* (a terminal surface in the dispatch
 * workspace) running `nvim .` on the worktree so the operator can watch the diffs live. When the
 * workspace is created, one terminal *pane* is laid out
 * per *track* (a parallel lane), NOT one per task: tasks that can run concurrently get their own
 * panes, while a dependency chain shares ONE pane and runs sequentially there (clear + respawn
 * between tasks). The panes are tiled into one balanced grid (a binary space partition, so the cells
 * stay roughly equal for any track count). Each task runs a standalone `claude` agent — interactively
 * (the TUI opens, no `-p`), Sonnet, --dangerously-skip-permissions — executing only that task. Each
 * agent gets `Notification` + `Stop` hooks (via `--settings`) that fire `cmux notify` when it needs an
 * answer or pauses. The adversarial `code-reviewer` agent (opus) reviews each task in a dedicated
 * appended pane; the `task-integrator` merges the change branch into base at the end.
 *
 * Run several changes in parallel by invoking this tool once per change: each gets an isolated
 * worktree + workspace + Code tab, so they never collide until the (human-gated) final merge.
 *
 * Mechanics only: parse INDEX.md + task frontmatter, build the dependency graph, manage the
 * worktree, lay out the cmux grid, and drive `cmux`. Human gating (per-wave confirmation, acting on
 * review/merge verdicts) lives in the `dispatch` skill, not here.
 *
 * Bun is allowed here — this file lives outside src/ (see "Zero Bun APIs in src/").
 *
 * Subcommands:
 *   plan    <change>                  Print JSON {change, workspaceName, tasks, waves}. Creates nothing.
 *   launch  <change> [--tasks a,b,c]  Ensure the change worktree+workspace, one pane per task.
 *   review  <change> [--tasks a,b,c]  Spawn an adversarial code-reviewer (opus) pane per task.
 *   merge   <change> [--base <ref>]   Spawn a task-integrator (MODE=merge) pane to integrate the branch.
 *   status  <change>                  Print per-task/review/merge running|done|blocked|failed verdicts.
 *   cleanup <change>                  Close the workspace and remove the worktree.
 *
 * Flags:
 *   --model <name>   Model for launched agents (default: sonnet).
 *   --tasks <csv>    Comma-separated task slugs (launch/review only).
 *   --base <ref>     Base branch to merge into (default: the root's current branch).
 *   --root <path>    Project root (default: cwd walked up to the nearest docs/plans).
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

const SENTINEL_DONE = "__TASK_DONE__";
const SENTINEL_BLOCKED = "__TASK_BLOCKED__";
const SENTINEL_FAIL = "__TASK_FAIL__";
const SENTINEL_REVIEW_OK = "__REVIEW_OK__";
const SENTINEL_REVIEW_FAIL = "__REVIEW_FAIL__";
const SENTINEL_MERGE_OK = "__MERGE_OK__";
const SENTINEL_MERGE_CONFLICT = "__MERGE_CONFLICT__";

type Requires = { intra: string[]; external: string[] };
type Task = {
  slug: string;
  path: string;
  domain: string;
  scope: string[];
  provides: string[];
  requires: Requires;
  rawRequires: string[];
  status: string;
  wave: number;
  /** Parallel lane (pane) this task runs in. Tasks in the same track reuse ONE pane sequentially. */
  track: number;
};
type Plan = {
  change: string;
  changeDir: string;
  workspaceName: string;
  tasks: Task[];
  waves: string[][];
};
type LaunchState = {
  change: string;
  workspaceName: string;
  workspaceRef: string;
  worktree: string;
  base: string;
  surfaces: Record<string, string>; // key (slug | review:<slug> | merge) -> surface ref
  trackSurfaces: Record<string, string>; // track index -> the single surface shared by that lane
  laneActive: Record<string, string>; // surface ref -> slug currently occupying it (for reuse detection)
  started: Record<string, boolean>; // key -> whether its launcher has already been sent
  model: string;
  codeTabRef?: string; // the side "Code" tab (nvim on the worktree), closed on cleanup
};

// ----------------------------------------------------------------------------
// CLI argument parsing
// ----------------------------------------------------------------------------

function parseArgs(argv: string[]): {
  command: string;
  change: string;
  flags: Record<string, string>;
} {
  const [command, change, ...rest] = argv;
  const flags: Record<string, string> = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true";
      }
    }
  }
  return { command: command ?? "", change: change ?? "", flags };
}

// ----------------------------------------------------------------------------
// Project root + change resolution
// ----------------------------------------------------------------------------

function findProjectRoot(start: string): string {
  let dir = resolve(start);
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, "docs", "plans"))) return dir;
    dir = dirname(dir);
  }
  throw new Error(
    `Could not locate project root (no docs/plans) above ${start}`,
  );
}

/** Find a change directory: an explicit path, or a slug under docs/plans/<...>/changes/<slug>. */
function resolveChangeDir(root: string, change: string): string {
  const asPath = resolve(change);
  if (existsSync(join(asPath, "INDEX.md")) && existsSync(join(asPath, "tasks")))
    return asPath;

  const matches: string[] = [];
  const plansRoot = join(root, "docs", "plans");
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (!statSync(full).isDirectory()) continue;
      if (entry === "archived") continue;
      if (dir.endsWith("changes") && entry === change) matches.push(full);
      walk(full);
    }
  };
  if (existsSync(plansRoot)) walk(plansRoot);

  if (matches.length === 1) return matches[0];
  if (matches.length === 0)
    throw new Error(`Change not found: "${change}" (searched ${plansRoot})`);
  throw new Error(
    `Ambiguous change "${change}" — matches:\n${matches.join("\n")}`,
  );
}

// ----------------------------------------------------------------------------
// Frontmatter + INDEX parsing (zero-dep, the YAML here is flat)
// ----------------------------------------------------------------------------

/** Parse a flat YAML frontmatter block: scalars and simple `- ` lists. */
function parseFrontmatter(content: string): Record<string, string | string[]> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const lines = match[1].split("\n");
  const out: Record<string, string | string[]> = {};
  let currentKey: string | null = null;
  for (const line of lines) {
    if (/^\s*-\s+/.test(line) && currentKey) {
      const item = line.replace(/^\s*-\s+/, "").trim();
      (out[currentKey] as string[]).push(stripQuotes(item));
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (kv) {
      const key = kv[1];
      const value = kv[2].trim();
      if (value === "") {
        out[key] = [];
        currentKey = key;
      } else if (value.startsWith("[") && value.endsWith("]")) {
        out[key] = value
          .slice(1, -1)
          .split(",")
          .map((s) => stripQuotes(s.trim()))
          .filter(Boolean);
        currentKey = null;
      } else {
        out[key] = stripQuotes(value);
        currentKey = null;
      }
    }
  }
  return out;
}

function stripQuotes(s: string): string {
  return s.replace(/^["']/, "").replace(/["']$/, "");
}

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

/** Read the ordered task slugs from a change INDEX.md "Execution order" section. */
function parseIndexOrder(indexPath: string): string[] {
  const content = readFileSync(indexPath, "utf8");
  const order: string[] = [];
  for (const line of content.split("\n")) {
    const m = line.match(
      /^\s*\d+\.\s*\[[^\]]+\]\(\.\/tasks\/([^)]+?)(?:\.md)?\)/,
    );
    if (m) order.push(m[1].replace(/\.md$/, ""));
  }
  return order;
}

// ----------------------------------------------------------------------------
// plan: build dependency graph + waves
// ----------------------------------------------------------------------------

function buildPlan(root: string, change: string): Plan {
  const changeDir = resolveChangeDir(root, change);
  const changeSlug = changeDir.split("/").pop() ?? change;
  const indexPath = join(changeDir, "INDEX.md");
  const tasksDir = join(changeDir, "tasks");

  const order = parseIndexOrder(indexPath);
  const fileSlugs = readdirSync(tasksDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
  const slugs = [
    ...order.filter((s) => fileSlugs.includes(s)),
    ...fileSlugs.filter((s) => !order.includes(s)),
  ];
  const slugSet = new Set(slugs);

  const tasks: Task[] = slugs.map((slug) => {
    const path = join(tasksDir, `${slug}.md`);
    const fm = parseFrontmatter(readFileSync(path, "utf8"));
    const rawRequires = asArray(fm.requires);
    const requires: Requires = { intra: [], external: [] };
    for (const req of rawRequires) {
      if (slugSet.has(req)) requires.intra.push(req);
      else requires.external.push(req);
    }
    return {
      slug,
      path,
      domain: (fm.domain as string) ?? "",
      scope: asArray(fm.scope),
      provides: asArray(fm.provides),
      requires,
      rawRequires,
      status: (fm.status as string) ?? "pending",
      wave: -1,
      track: -1,
    };
  });

  assignWaves(tasks);
  assignTracks(tasks);

  return {
    change: changeSlug,
    changeDir,
    workspaceName: `dispatch/${changeSlug}`,
    tasks,
    waves: groupWaves(tasks),
  };
}

/** Topological wave assignment over intra-change deps. External deps don't affect waves. */
function assignWaves(tasks: Task[]): void {
  const bySlug = new Map(tasks.map((t) => [t.slug, t]));
  const resolved = new Set<string>();
  let guard = 0;
  while (resolved.size < tasks.length) {
    if (guard++ > tasks.length + 1) {
      const wave = Math.max(0, ...tasks.map((t) => t.wave)) + 1;
      for (const t of tasks) if (t.wave === -1) t.wave = wave;
      break;
    }
    for (const t of tasks) {
      if (t.wave !== -1) continue;
      const depsReady = t.requires.intra.every((d) => resolved.has(d));
      if (depsReady) {
        const depWaves = t.requires.intra.map((d) => bySlug.get(d)?.wave ?? 0);
        t.wave = depWaves.length ? Math.max(...depWaves) + 1 : 0;
      }
    }
    for (const t of tasks) if (t.wave !== -1) resolved.add(t.slug);
  }
}

function groupWaves(tasks: Task[]): string[][] {
  const maxWave = Math.max(0, ...tasks.map((t) => t.wave));
  const waves: string[][] = [];
  for (let w = 0; w <= maxWave; w++)
    waves.push(tasks.filter((t) => t.wave === w).map((t) => t.slug));
  return waves.filter((w) => w.length > 0);
}

/**
 * Assign each non-completed task a *track* (a parallel lane = one pane). Interval-graph lane packing
 * over waves: tasks of the SAME wave never share a lane (they run concurrently, side by side), while
 * a dependent task in a later wave REUSES a lane whose previous occupant has already finished — so a
 * dependency chain runs sequentially in a single pane (clear + respawn between tasks). A task prefers
 * the lane of one of its own dependencies (visual continuation) when that lane is free. The lane count
 * is therefore the graph's peak concurrency, not the task count. Completed tasks get track -1 (no pane).
 */
function assignTracks(tasks: Task[]): void {
  for (const t of tasks) t.track = -1;
  const active = tasks
    .filter((t) => t.status !== "completed")
    .sort((a, b) => a.wave - b.wave);
  const laneLastWave: number[] = []; // lane index -> wave of its last assigned task
  const laneOf = new Map<string, number>();
  for (const t of active) {
    const depLanes = t.requires.intra
      .map((d) => laneOf.get(d))
      .filter((l): l is number => l !== undefined);
    let lane = depLanes.find((dl) => laneLastWave[dl] < t.wave) ?? -1; // continue a finished dependency's lane
    if (lane === -1) lane = laneLastWave.findIndex((w) => w < t.wave); // otherwise any free lane
    if (lane === -1) {
      lane = laneLastWave.length; // none free -> open a new lane (raises peak concurrency)
      laneLastWave.push(t.wave);
    } else {
      laneLastWave[lane] = t.wave;
    }
    laneOf.set(t.slug, lane);
    t.track = lane;
  }
}

// ----------------------------------------------------------------------------
// git + worktree
// ----------------------------------------------------------------------------

function git(cwd: string, args: string[]): string {
  const proc = Bun.spawnSync(["git", ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = proc.stdout.toString().trim();
  const err = proc.stderr.toString().trim();
  if (proc.exitCode !== 0)
    throw new Error(
      `git ${args.join(" ")} failed (${proc.exitCode}): ${err || out}`,
    );
  return out;
}

function worktreePath(root: string, change: string): string {
  return join(root, ".claude", "worktrees", `dispatch-${change}`);
}

function currentBranch(root: string): string {
  try {
    return git(root, ["rev-parse", "--abbrev-ref", "HEAD"]);
  } catch {
    return "main";
  }
}

/** Create (once) a git worktree for the change on branch dispatch/<change>, based on root HEAD. */
function ensureWorktree(root: string, change: string): string {
  const wt = worktreePath(root, change);
  if (existsSync(wt)) return wt;
  mkdirSync(dirname(wt), { recursive: true });
  git(root, ["worktree", "add", "-B", `dispatch/${change}`, wt, "HEAD"]);
  return wt;
}

// ----------------------------------------------------------------------------
// cmux helpers
// ----------------------------------------------------------------------------

function cmux(args: string[], opts: { json?: boolean } = {}): string {
  const full = opts.json ? ["--json", ...args] : args;
  const proc = Bun.spawnSync(["cmux", ...full], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = proc.stdout.toString().trim();
  const err = proc.stderr.toString().trim();
  if (proc.exitCode !== 0)
    throw new Error(
      `cmux ${full.join(" ")} failed (${proc.exitCode}): ${err || out}`,
    );
  return out;
}

function cmuxJson(args: string[]): unknown {
  const out = cmux(args, { json: true });
  try {
    return JSON.parse(out);
  } catch {
    return out;
  }
}

/** First `surface:<ref>` mentioned anywhere in a cmux payload (string or JSON object). */
function firstSurfaceRef(payload: unknown): string | null {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload);
  const match = text.match(/surface:[0-9a-fA-F-]+/);
  return match ? match[0] : null;
}

/** Split a pane off the given surface in a direction; return the newly created surface ref. */
function cmuxSplit(
  workspace: string,
  surface: string,
  direction: "right" | "down",
): string {
  const created = cmuxJson([
    "new-split",
    direction,
    "--workspace",
    workspace,
    "--surface",
    surface,
    "--focus",
    "false",
  ]);
  const ref = firstSurfaceRef(created);
  if (!ref)
    throw new Error(`new-split ${direction} on ${surface} returned no surface`);
  return ref;
}

/**
 * Tile `count` panes into one balanced grid via a binary space partition. `new-split` always halves
 * 50/50, so we recursively split the task set into two near-equal halves, alternating the split
 * orientation each level — every leaf cell ends up with roughly equal area for any count. Returns
 * the leaf surfaces left-to-right / top-to-bottom (the order tasks are assigned to panes).
 */
function buildGrid(
  workspace: string,
  rootSurface: string,
  count: number,
  horizontal = true,
): string[] {
  if (count <= 1) return [rootSurface];
  const leftCount = Math.ceil(count / 2);
  const rightCount = count - leftCount;
  const sibling = cmuxSplit(
    workspace,
    rootSurface,
    horizontal ? "right" : "down",
  );
  const left = buildGrid(workspace, rootSurface, leftCount, !horizontal);
  const right = buildGrid(workspace, sibling, rightCount, !horizontal);
  return [...left, ...right];
}

/** Pull the first workspace/pane/surface ref out of a cmux JSON-ish payload. */
function extractRef(
  payload: unknown,
  kind: "workspace" | "pane" | "surface",
): string | null {
  if (!payload) return null;
  if (typeof payload === "string") {
    const m = payload.match(new RegExp(`${kind}:[0-9a-fA-F-]+`));
    return m ? m[0] : null;
  }
  const record = payload as Record<string, unknown>;
  const candidates = [
    record[kind],
    record[`${kind}Ref`],
    record[`${kind}_id`],
    record.ref,
    record.id,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && (c.startsWith(`${kind}:`) || c.includes("-")))
      return c;
  }
  for (const key of Object.keys(record)) {
    if (typeof record[key] === "object") {
      const nested = extractRef(record[key], kind);
      if (nested) return nested;
    }
  }
  return null;
}

// ----------------------------------------------------------------------------
// state
// ----------------------------------------------------------------------------

// Resolved once in main(); the state dir is derived from it so it is the SAME across every
// invocation and every session for a given project. Do NOT key it on CLAUDE_JOB_DIR — that varies
// per job/session and would fragment the state (different sessions seeing different workspaces).
let dispatchRoot = "";

/** A stable, filesystem-safe key for a project root: `<basename>-<djb2 hash>`. */
function projectKey(root: string): string {
  let hash = 5381;
  for (let i = 0; i < root.length; i++)
    hash = ((hash << 5) + hash + root.charCodeAt(i)) >>> 0;
  const name = root.split("/").filter(Boolean).pop() ?? "project";
  return `${name}-${hash.toString(36)}`;
}

/**
 * Deterministic per-project scratch dir for state, launchers, hooks and settings. Stable across
 * invocations/sessions (keyed on the project root, not CLAUDE_JOB_DIR) so a later `status`/`review`
 * sees the same workspace a prior `launch` created.
 */
function tmpDir(): string {
  const base = process.env.TMPDIR ?? "/tmp";
  const dir = join(
    base,
    "cmux-dispatch",
    dispatchRoot ? projectKey(dispatchRoot) : "default",
  );
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function stateFile(change: string): string {
  return join(tmpDir(), `dispatch-${change}.json`);
}

function loadState(change: string): LaunchState | null {
  const f = stateFile(change);
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
}

function saveState(state: LaunchState): void {
  writeFileSync(stateFile(state.change), JSON.stringify(state, null, 2));
}

// ----------------------------------------------------------------------------
// launchers (one bash file per agent, sent into a fresh pane)
// ----------------------------------------------------------------------------

/** Quote a string as a single shell argument (safe for embedding in a hook command). */
function shellArg(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

/**
 * Write (once) the PreToolUse guard that keeps dispatch agents OUT of `.claude/`: they may only touch
 * the application (`src/`) and its modules (plus docs/plans archival). Because agents run with
 * `--dangerously-skip-permissions`, `permissions.deny` is ignored — only a hook can block. Covers
 * Write/Edit/MultiEdit into `.claude/` and Bash writes/skills-installers that scatter the repo.
 */
function writeDispatchGuardHook(worktree?: string): string {
  const tag = worktree ? basename(worktree) : "root";
  const file = join(tmpDir(), `dispatch-guard-${tag}.sh`);
  const deny = (reason: string) =>
    `echo '{"decision":"block","reason":"${reason}"}'; exit 0`;
  // When a worktree is given (task/review agents), the ONLY writable area is that worktree — this
  // subsumes the .claude/ block and is what STRUCTURALLY stops agents from spilling docs/plans or src
  // edits onto the project root (the "leak into main" the operator kept hitting). The merge agent runs
  // at the root, so it gets no worktree and falls back to the narrower .claude/-only block.
  const writeRule = worktree
    ? `    if [[ -n "$fp" && "$fp" != "$WT"/* && "$fp" != "$WT" ]]; then
      ${deny("Blocked: dispatch agents must write ONLY inside their own worktree. The task file, its docs/plans entry, and all of src/ live under this worktree — never edit the project root or another worktree.")}
    fi`
    : `    if [[ "$fp" == *"/.claude/"* || "$fp" == ".claude/"* ]]; then
      ${deny("Blocked: dispatch agents must not modify .claude/ (hooks, skills, agents, settings). Work only in the application (src/) and its modules.")}
    fi`;
  const script = `#!/usr/bin/env bash
set -e
WT=${worktree ? shellArg(worktree) : "''"}
input=$(cat)
tool=$(echo "$input" | jq -r '.tool_name // empty')
case "$tool" in
  Write|Edit|MultiEdit)
    fp=$(echo "$input" | jq -r '.tool_input.file_path // empty')
${writeRule}
    ;;
  Bash)
    cmd=$(echo "$input" | jq -r '.tool_input.command // empty')
    if echo "$cmd" | grep -qE 'skills[[:space:]]+add|npx[[:space:]]+[^|]*skills'; then
      ${deny("Blocked: dispatch agents must not run skills installers (npx skills add) — they write into .claude/ and scatter other-agent dirs across the repo.")}
    fi
    if echo "$cmd" | grep -qE '(>|>>|[[:space:]]tee[[:space:]]|[[:space:]]mv[[:space:]]|[[:space:]]cp[[:space:]]|[[:space:]]rm[[:space:]]|[[:space:]]mkdir[[:space:]]|[[:space:]]touch[[:space:]])[^|]*\\.claude/'; then
      ${deny("Blocked: dispatch agents must not write into .claude/. Work only in the application (src/) and its modules.")}
    fi
    ;;
esac
echo '{}'
exit 0
`;
  writeFileSync(file, script, { mode: 0o755 });
  return file;
}

/**
 * Write a Claude Code settings file wiring: `Notification` + `Stop` hooks to `cmux notify` (so the
 * pane pings when its agent needs an answer or pauses), and a `PreToolUse` guard that blocks any
 * write under `.claude/`. `--settings` merges with the project's settings, so the project guard hook
 * stays active and this only adds to it.
 */
function writeHooksSettings(
  key: string,
  change: string,
  label: string,
  worktree?: string,
): string {
  const file = join(tmpDir(), `hooks-${key}.json`);
  const notify = (subtitle: string, body: string) =>
    `command -v cmux >/dev/null 2>&1 && cmux notify --title ${shellArg(`dispatch · ${change}`)} ` +
    `--subtitle ${shellArg(`${label} · ${subtitle}`)} --body ${shellArg(body)}`;
  const settings = {
    hooks: {
      PreToolUse: [
        {
          matcher: "Write|Edit|MultiEdit|Bash",
          hooks: [
            { type: "command", command: writeDispatchGuardHook(worktree) },
          ],
        },
      ],
      Notification: [
        {
          matcher: "*",
          hooks: [
            {
              type: "command",
              command: notify(
                "precisa de resposta",
                "O agente aguarda sua resposta neste pane.",
              ),
            },
          ],
        },
      ],
      Stop: [
        {
          matcher: "",
          hooks: [
            {
              type: "command",
              command: notify(
                "pausou",
                "O agente terminou o turno e parou neste pane.",
              ),
            },
          ],
        },
      ],
    },
  };
  writeFileSync(file, JSON.stringify(settings, null, 2));
  return file;
}

function writeTaskLauncher(
  root: string,
  cwd: string,
  change: string,
  task: Task,
  model: string,
): string {
  const file = join(tmpDir(), `launch-${task.slug}.sh`);
  // The task file, its docs/plans entry, and src/ all live UNDER the worktree (cwd). Point the agent
  // at the worktree copy of the task — pointing it at the root path (task.path) is what made agents
  // flip frontmatter / refresh INDEX on the root working tree, leaking work onto main.
  const taskInWorktree = join(cwd, relative(root, task.path));
  const prompt =
    `You are working INSIDE an isolated git worktree at ${cwd}. EVERY path you read or write — the ` +
    `task file, its docs/plans entry, and all of src/ — lives under THIS worktree, never at the ` +
    `project root. Execute ONLY the task at ${taskInWorktree}. Read it and implement only this ` +
    `task's scope; never touch other src/modules. NEVER read or edit files at the project root ` +
    `outside this worktree, NEVER modify anything under .claude/, and NEVER run skills installers ` +
    `such as 'npx skills add' — a guard hook blocks every write outside this worktree. Run bun test ` +
    `for the affected module. When complete, set status: completed in the task frontmatter (the copy ` +
    `under this worktree), run the guard and sync skills to archive the task and refresh the INDEX, ` +
    `then stage and commit with git add -A && git commit -m "dispatch(${task.slug}): implement task". ` +
    `Print exactly ${SENTINEL_DONE}${task.slug} on its own line. If blocked by a missing requirement, ` +
    `print ${SENTINEL_BLOCKED}${task.slug} and stop. On unrecoverable failure print ${SENTINEL_FAIL}${task.slug}.`;
  const settings = writeHooksSettings(task.slug, change, task.slug, cwd);
  const script =
    `#!/usr/bin/env bash\n` +
    `cd ${shellArg(cwd)}\n` +
    `claude ${shellArg(prompt)} --model ${shellArg(model)} --dangerously-skip-permissions --add-dir ${shellArg(cwd)} --settings ${shellArg(settings)}\n` +
    `printf '\\n[dispatch] task ${task.slug} session ended\\n'\n`;
  writeFileSync(file, script, { mode: 0o755 });
  return file;
}

function writeReviewLauncher(
  root: string,
  cwd: string,
  change: string,
  task: Task,
): string {
  const file = join(tmpDir(), `review-${task.slug}.sh`);
  // Review is the last human-free line of defense before CI, so it runs the dedicated adversarial
  // code-reviewer on a STRONGER model (opus) than the implementation default — rigor where it matters.
  const reviewModel = "opus";
  const agentPath = join(root, ".claude", "agents", "code-reviewer.md");
  const prompt =
    `Follow the instructions in ${agentPath}. You are the autonomous reviewer for the task at ` +
    `${join(cwd, relative(root, task.path))} in this worktree — no human reads your verdict, so be ` +
    `adversarial and decisive. Inspect the latest commit + working tree via git, apply the severity ` +
    `rubric, and run bun test for the affected module. If there is any critical/high finding or the ` +
    `module tests fail, print ${SENTINEL_REVIEW_FAIL}${task.slug} on its own line followed by a ` +
    `numbered, severity-tagged findings list; otherwise print ${SENTINEL_REVIEW_OK}${task.slug} ` +
    `(optionally with a NOTES: section for medium/low items).`;
  const settings = writeHooksSettings(
    `review-${task.slug}`,
    change,
    `review:${task.slug}`,
    cwd,
  );
  const script =
    `#!/usr/bin/env bash\n` +
    `cd ${shellArg(cwd)}\n` +
    `claude ${shellArg(prompt)} --model ${reviewModel} --dangerously-skip-permissions --add-dir ${shellArg(cwd)} --settings ${shellArg(settings)}\n`;
  writeFileSync(file, script, { mode: 0o755 });
  return file;
}

function writeMergeLauncher(
  root: string,
  state: LaunchState,
  model: string,
): string {
  const file = join(tmpDir(), `merge-${state.change}.sh`);
  const agentPath = join(root, ".claude", "agents", "task-integrator.md");
  const branch = `dispatch/${state.change}`;
  const prompt =
    `Follow the instructions in ${agentPath}. MODE=merge. Integrate branch ${branch} into ${state.base}. ` +
    `If the base working tree is dirty, abort and print ${SENTINEL_MERGE_CONFLICT}${state.change}. ` +
    `Otherwise git checkout ${state.base}, git merge --no-ff ${branch}, resolve any conflicts ` +
    `preserving both sides, run bun test, and commit. On success print ${SENTINEL_MERGE_OK}${state.change} ` +
    `on its own line; if you cannot resolve safely, git merge --abort and print ` +
    `${SENTINEL_MERGE_CONFLICT}${state.change}.`;
  const settings = writeHooksSettings(
    `merge-${state.change}`,
    state.change,
    "merge",
  );
  const script =
    `#!/usr/bin/env bash\n` +
    `cd ${shellArg(root)}\n` +
    `claude ${shellArg(prompt)} --model ${shellArg(model)} --dangerously-skip-permissions --add-dir ${shellArg(root)} --settings ${shellArg(settings)}\n`;
  writeFileSync(file, script, { mode: 0o755 });
  return file;
}

// ----------------------------------------------------------------------------
// workspace + pane spawning
// ----------------------------------------------------------------------------

/**
 * Create (once) the change's workspace and tile one pane per *track* (parallel lane) into a single
 * balanced grid — NOT one pane per task. A dependency chain shares a single lane/pane and runs
 * sequentially there (clear + respawn between tasks), so the pane count is the graph's peak
 * concurrency. Every non-completed task is pre-mapped to its lane's surface up front, so launching a
 * wave only sends a command into an already-visible pane. Also opens a side "Code" tab running
 * `nvim .` on this change's worktree so the operator can watch the diffs live.
 */
function ensureWorkspace(root: string, plan: Plan, model: string): LaunchState {
  const existing = loadState(plan.change);
  if (existing?.workspaceRef) return existing;
  const worktree = ensureWorktree(root, plan.change);
  const base = currentBranch(root);
  const created = cmuxJson([
    "new-workspace",
    "--name",
    plan.workspaceName,
    "--cwd",
    worktree,
    "--focus",
    "true",
  ]);
  const workspaceRef = extractRef(created, "workspace") ?? plan.workspaceName;

  const surfaces: Record<string, string> = {};
  const trackSurfaces: Record<string, string> = {};
  // One pane per track (lane). Tasks of the same track share that lane's surface and reuse it in turn.
  const paneTasks = plan.tasks.filter((t) => t.status !== "completed");
  const trackCount = paneTasks.length
    ? Math.max(...paneTasks.map((t) => t.track)) + 1
    : 0;
  const initial = firstSurfaceRef(
    cmuxJson(["list-pane-surfaces", "--workspace", workspaceRef]),
  );
  if (trackCount && initial) {
    const grid = buildGrid(workspaceRef, initial, trackCount);
    for (let i = 0; i < trackCount; i++) trackSurfaces[i] = grid[i] ?? initial;
    for (const task of paneTasks)
      surfaces[task.slug] = trackSurfaces[task.track] ?? initial;
  }

  const codeTabRef = openCodeTab(workspaceRef, plan.change);
  // openCodeTab may steal focus; bring the dispatch workspace back to the front.
  try {
    cmux(["select-workspace", "--workspace", workspaceRef]);
  } catch {
    /* best-effort focus restore */
  }

  const state: LaunchState = {
    change: plan.change,
    workspaceName: plan.workspaceName,
    workspaceRef,
    worktree,
    base,
    surfaces,
    trackSurfaces,
    laneActive: {},
    started: {},
    model,
    codeTabRef,
  };
  saveState(state);
  return state;
}

/**
 * Open a "Code" *tab* (a terminal surface inside the dispatch workspace) running `nvim .` on the
 * change's worktree, so the operator can browse the live modifications alongside the agent panes.
 * Best-effort: a failure here must never abort a dispatch, so everything is wrapped and only logged.
 */
function openCodeTab(workspaceRef: string, change: string): string | undefined {
  try {
    const created = cmuxJson([
      "new-surface",
      "--type",
      "terminal",
      "--workspace",
      workspaceRef,
      "--focus",
      "false",
    ]);
    const surfaceRef =
      firstSurfaceRef(created) ?? extractRef(created, "surface");
    if (!surfaceRef) return undefined;
    try {
      cmux([
        "tab-action",
        "--action",
        "rename",
        "--surface",
        surfaceRef,
        "--workspace",
        workspaceRef,
        "--title",
        "Code",
      ]);
    } catch {
      /* naming is cosmetic */
    }
    cmux([
      "send",
      "--workspace",
      workspaceRef,
      "--surface",
      surfaceRef,
      "nvim .\n",
    ]);
    return surfaceRef;
  } catch (e) {
    process.stderr.write(
      `[dispatch] code tab for ${change} failed: ${(e as Error).message}\n`,
    );
    return undefined;
  }
}

/** Send a launcher into an existing surface, marking the key as started (idempotent). */
function runInSurface(
  state: LaunchState,
  key: string,
  surface: string,
  launcher: string,
): void {
  if (state.started[key]) {
    process.stderr.write(`[dispatch] ${key} already started, skipping\n`);
    return;
  }
  cmux([
    "send",
    "--workspace",
    state.workspaceRef,
    "--surface",
    surface,
    `bash '${launcher}'\n`,
  ]);
  state.surfaces[key] = surface;
  state.started[key] = true;
  saveState(state);
  process.stderr.write(`[dispatch] ${key} -> ${surface}\n`);
}

/**
 * Reuse a lane's existing surface for the NEXT task in its dependency chain: clear the scrollback and
 * `respawn-pane` with the new launcher. respawn kills the previous (interactive) `claude` TUI that
 * never exits on its own, so the next task starts fresh in the SAME pane — the sequential-chain
 * behaviour the operator asked for. Clearing first also removes the prior task's on-screen sentinels,
 * so `paneVerdict` can't pick up a stale verdict from the lane's previous occupant.
 */
function reuseSurface(
  state: LaunchState,
  key: string,
  surface: string,
  launcher: string,
): void {
  if (state.started[key]) {
    process.stderr.write(`[dispatch] ${key} already started, skipping\n`);
    return;
  }
  try {
    cmux([
      "clear-history",
      "--workspace",
      state.workspaceRef,
      "--surface",
      surface,
    ]);
  } catch {
    /* clearing is best-effort; respawn replaces the contents anyway */
  }
  cmux([
    "respawn-pane",
    "--workspace",
    state.workspaceRef,
    "--surface",
    surface,
    "--command",
    `bash '${launcher}'`,
  ]);
  state.surfaces[key] = surface;
  state.started[key] = true;
  saveState(state);
  process.stderr.write(`[dispatch] ${key} -> ${surface} (reused lane)\n`);
}

/**
 * Append a fresh pane (a clean shell) to the grid and run a launcher in it. Used for review and
 * merge: they must NOT reuse the task's pane, because in interactive mode the task's `claude` TUI
 * never exits — sending into its surface would land in the chat, not a shell.
 */
function appendPane(state: LaunchState, key: string, launcher: string): string {
  if (state.started[key]) {
    process.stderr.write(`[dispatch] ${key} already started, skipping\n`);
    return state.surfaces[key] ?? "";
  }
  const anchor = Object.values(state.surfaces)[0];
  const surface = anchor
    ? cmuxSplit(state.workspaceRef, anchor, "down")
    : (firstSurfaceRef(
        cmuxJson(["list-pane-surfaces", "--workspace", state.workspaceRef]),
      ) ?? "");
  if (!surface) throw new Error(`Could not resolve a surface for ${key}`);
  runInSurface(state, key, surface, launcher);
  return surface;
}

function launch(
  root: string,
  plan: Plan,
  taskSlugs: string[],
  model: string,
): LaunchState {
  const state = ensureWorkspace(root, plan, model);
  state.model = model;
  state.laneActive ??= {}; // tolerate states created before lane reuse existed
  const bySlug = new Map(plan.tasks.map((t) => [t.slug, t]));
  for (const slug of taskSlugs) {
    const task = bySlug.get(slug);
    if (!task) throw new Error(`Unknown task slug: ${slug}`);
    const surface = state.surfaces[slug];
    if (!surface) {
      process.stderr.write(
        `[dispatch] ${slug} has no pane (completed?), skipping\n`,
      );
      continue;
    }
    const launcher = writeTaskLauncher(
      root,
      state.worktree,
      plan.change,
      task,
      model,
    );
    // If this lane already ran a (now-finished) task, reuse its surface: clear + respawn. Otherwise
    // it's the lane's first task — send into the freshly placed pane.
    const occupant = state.laneActive[surface];
    if (occupant && occupant !== slug)
      reuseSurface(state, slug, surface, launcher);
    else runInSurface(state, slug, surface, launcher);
    state.laneActive[surface] = slug;
  }
  saveState(state);
  return state;
}

function review(
  root: string,
  plan: Plan,
  taskSlugs: string[],
  _model: string,
): LaunchState {
  const state = loadState(plan.change);
  if (!state)
    throw new Error(
      `No launch state for "${plan.change}". Run "launch" first.`,
    );
  const bySlug = new Map(plan.tasks.map((t) => [t.slug, t]));
  for (const slug of taskSlugs) {
    const task = bySlug.get(slug);
    if (!task) throw new Error(`Unknown task slug: ${slug}`);
    // Review runs in its OWN fresh pane (a clean shell), never the task's pane: in interactive mode
    // the task's claude TUI is still open, so sending into its surface would type into the chat.
    appendPane(
      state,
      `review:${slug}`,
      writeReviewLauncher(root, state.worktree, plan.change, task),
    );
  }
  saveState(state);
  return state;
}

function merge(
  root: string,
  plan: Plan,
  model: string,
  base?: string,
): LaunchState {
  const state = loadState(plan.change);
  if (!state)
    throw new Error(
      `No launch state for "${plan.change}". Run "launch" first.`,
    );
  if (base) state.base = base;
  appendPane(state, "merge", writeMergeLauncher(root, state, model));
  saveState(state);
  return state;
}

// ----------------------------------------------------------------------------
// status
// ----------------------------------------------------------------------------

function paneVerdict(
  state: LaunchState,
  key: string,
  sentinels: Record<string, string>,
): string {
  const surface = state.surfaces[key];
  if (!surface) return "not-launched";
  let screen = "";
  try {
    screen = cmux([
      "read-screen",
      "--workspace",
      state.workspaceRef,
      "--surface",
      surface,
      "--scrollback",
      "--lines",
      "400",
    ]);
  } catch {
    /* surface may be gone */
  }
  // In interactive mode the launcher prompt is echoed in the pane and itself names every sentinel,
  // so the first occurrence of a marker is the prompt, not a verdict. Require it to appear at least
  // twice (prompt + the agent actually printing it) before treating it as a real verdict.
  for (const [verdict, marker] of Object.entries(sentinels)) {
    if (screen.split(marker).length - 1 >= 2) return verdict;
  }
  return "running";
}

/**
 * Read a task's frontmatter status from the *worktree* (where the agent actually flips it and runs
 * guard/sync), checking both `tasks/` and the sibling `archived/`. The root copy is irrelevant — the
 * work lives on the change branch — and reading the worktree is immune to the prompt-echo false
 * positive that affects on-screen sentinels.
 */
function worktreeTaskStatus(
  worktree: string,
  root: string,
  rootTaskPath: string,
): string {
  const rel = relative(root, rootTaskPath);
  const candidates = [
    join(worktree, rel),
    join(worktree, dirname(rel), "..", "archived", basename(rel)),
  ];
  for (const candidate of candidates) {
    try {
      return (
        (parseFrontmatter(readFileSync(candidate, "utf8")).status as string) ??
        "pending"
      );
    } catch {
      /* not at this path */
    }
  }
  return "pending";
}

function readStatus(
  root: string,
  plan: Plan,
): Record<string, Record<string, string>> {
  const state = loadState(plan.change);
  const tasks: Record<string, string> = {};
  const reviews: Record<string, string> = {};
  let mergeVerdict: string | undefined;

  for (const task of plan.tasks) {
    // A pane is pre-allocated at workspace creation, so "launched" means its launcher was sent.
    if (!state?.started[task.slug]) {
      tasks[task.slug] = "not-launched";
    } else {
      // Either the agent flipped frontmatter to completed (read from the worktree), or the pane
      // sentinel fired (twice — see paneVerdict).
      const fmStatus = worktreeTaskStatus(state.worktree, root, task.path);
      tasks[task.slug] =
        fmStatus === "completed"
          ? "done"
          : paneVerdict(state, task.slug, {
              done: `${SENTINEL_DONE}${task.slug}`,
              blocked: `${SENTINEL_BLOCKED}${task.slug}`,
              failed: `${SENTINEL_FAIL}${task.slug}`,
            });
    }
    if (state?.started[`review:${task.slug}`]) {
      reviews[task.slug] = paneVerdict(state, `review:${task.slug}`, {
        ok: `${SENTINEL_REVIEW_OK}${task.slug}`,
        findings: `${SENTINEL_REVIEW_FAIL}${task.slug}`,
      });
    }
  }
  if (state?.started.merge) {
    mergeVerdict = paneVerdict(state, "merge", {
      ok: `${SENTINEL_MERGE_OK}${plan.change}`,
      conflict: `${SENTINEL_MERGE_CONFLICT}${plan.change}`,
    });
  }
  const out: Record<string, Record<string, string>> = { tasks, reviews };
  if (mergeVerdict) out.merge = { [plan.change]: mergeVerdict };
  return out;
}

// ----------------------------------------------------------------------------
// cleanup
// ----------------------------------------------------------------------------

function cleanup(root: string, plan: Plan): void {
  const state = loadState(plan.change);
  if (state?.workspaceRef) {
    try {
      cmux(["close-workspace", "--workspace", state.workspaceRef]);
    } catch (e) {
      process.stderr.write(
        `[dispatch] close-workspace failed: ${(e as Error).message}\n`,
      );
    }
  }
  if (state?.codeTabRef) {
    try {
      cmux([
        "close-surface",
        "--surface",
        state.codeTabRef,
        "--workspace",
        state.workspaceRef,
      ]);
    } catch (e) {
      process.stderr.write(
        `[dispatch] close code tab failed: ${(e as Error).message}\n`,
      );
    }
  }
  try {
    git(root, [
      "worktree",
      "remove",
      "--force",
      worktreePath(root, plan.change),
    ]);
  } catch (e) {
    process.stderr.write(
      `[dispatch] worktree remove failed: ${(e as Error).message}\n`,
    );
  }
  if (state) saveState({ ...state, surfaces: {}, started: {} });
}

// ----------------------------------------------------------------------------
// main
// ----------------------------------------------------------------------------

function main(): void {
  const { command, change, flags } = parseArgs(process.argv.slice(2));
  if (!command || command === "--help" || command === "help") {
    console.log(USAGE);
    return;
  }
  if (!change) throw new Error(`Missing <change> argument. See --help.`);

  const root = flags.root
    ? resolve(flags.root)
    : findProjectRoot(process.cwd());
  dispatchRoot = root; // anchor the (deterministic) state dir to this project before any tmpDir() call
  const plan = buildPlan(root, change);
  const model = flags.model ?? "sonnet";
  const taskSlugs = flags.tasks
    ? flags.tasks
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : (plan.waves[0] ?? []);

  switch (command) {
    case "plan":
      console.log(JSON.stringify(serializePlan(plan), null, 2));
      break;
    case "launch": {
      const state = launch(root, plan, taskSlugs, model);
      const launched = Object.fromEntries(
        taskSlugs
          .filter((s) => state.started[s])
          .map((s) => [s, state.surfaces[s]]),
      );
      const grid = Object.fromEntries(
        plan.tasks
          .filter((t) => state.surfaces[t.slug])
          .map((t) => [t.slug, state.surfaces[t.slug]]),
      );
      console.log(
        JSON.stringify(
          {
            change: plan.change,
            workspace: state.workspaceName,
            worktree: state.worktree,
            base: state.base,
            grid,
            launched,
          },
          null,
          2,
        ),
      );
      break;
    }
    case "review": {
      const slugs = flags.tasks ? taskSlugs : plan.tasks.map((t) => t.slug);
      const state = review(root, plan, slugs, model);
      const reviews = Object.fromEntries(
        slugs
          .filter((s) => state.started[`review:${s}`])
          .map((s) => [s, state.surfaces[`review:${s}`]]),
      );
      console.log(JSON.stringify({ change: plan.change, reviews }, null, 2));
      break;
    }
    case "merge": {
      const state = merge(root, plan, model, flags.base);
      console.log(
        JSON.stringify(
          {
            change: plan.change,
            base: state.base,
            mergeSurface: state.surfaces.merge,
          },
          null,
          2,
        ),
      );
      break;
    }
    case "status":
      console.log(
        JSON.stringify(
          { change: plan.change, ...readStatus(root, plan) },
          null,
          2,
        ),
      );
      break;
    case "cleanup":
      cleanup(root, plan);
      console.log(
        JSON.stringify({ change: plan.change, cleaned: true }, null, 2),
      );
      break;
    default:
      throw new Error(`Unknown command "${command}". See --help.`);
  }
}

/**
 * Does this task generate or edit a D1 migration / Drizzle schema? Two changes running in parallel
 * that both touch migrations collide on the shared `migrations/meta/_journal.json` and on duplicate
 * sequence numbers (both emit `0005_*`). The orchestrator uses this to SERIALIZE migration-bearing
 * changes (run them back to back) while still parallelizing everything else.
 */
function touchesMigrations(task: Task): boolean {
  const paths = [...task.scope, ...task.provides];
  // Match real migration / DB-schema FILE references, not the word "schema" in prose (e.g. a TypeBox
  // "configSchemas" provider task is not a migration). Anchors: a migrations/ path, a .sql file, or
  // the Drizzle schema module (src/infrastructure/database/schema.ts or src/db/schema.ts).
  return paths.some((p) =>
    /(^|[\s/])migrations?\/|\.sql\b|\b(?:database|db)\/schema(?:\.ts)?\b|\bmigration\b/i.test(
      p,
    ),
  );
}

function serializePlan(plan: Plan) {
  return {
    change: plan.change,
    changeDir: plan.changeDir,
    workspaceName: plan.workspaceName,
    waves: plan.waves,
    // A change with any of these tasks must NOT run in parallel with another migration-bearing change.
    migrationTasks: plan.tasks.filter(touchesMigrations).map((t) => t.slug),
    tasks: plan.tasks.map((t) => ({
      slug: t.slug,
      path: t.path,
      domain: t.domain,
      scope: t.scope,
      provides: t.provides,
      requires: t.requires,
      status: t.status,
      wave: t.wave,
      track: t.track,
      touchesMigrations: touchesMigrations(t),
    })),
  };
}

const USAGE = `dispatch.ts — one Claude agent per task of a change, via cmux + git worktree

Usage:
  bun dispatch.ts plan    <change>
  bun dispatch.ts launch  <change> [--tasks a,b,c] [--model sonnet]
  bun dispatch.ts review  <change> [--tasks a,b,c] [--model sonnet]
  bun dispatch.ts merge   <change> [--base <ref>]  [--model sonnet]
  bun dispatch.ts status  <change>
  bun dispatch.ts cleanup <change>

<change> is a change slug (searched under docs/plans/**/changes/) or a path to a change dir.
Each change runs in its own git worktree on branch dispatch/<change>; merge integrates it into base.
Flags:
  --tasks <csv>   Task slugs (launch: default first wave; review: default all).
  --model <name>  Model for launched agents (default: sonnet).
  --base <ref>    Base branch to merge into (default: the root's current branch).
  --root <path>   Project root override (default: nearest ancestor with docs/plans).`;

main();
