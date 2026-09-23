import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export type Expectation = "pass" | "fail";

export interface DotnetCheck {
  project: string;
  expect: Expectation;
  minErrors?: number;
  /** Restrict minErrors to errors whose code starts with this prefix, such as "CS". */
  errorPattern?: string;
  includeHidden?: boolean;
}

export interface NpmCheck {
  script: "build" | "test";
  expect: Expectation;
  cwd?: string;
  includeHidden?: boolean;
}

export interface JsonCheck {
  files: string[];
  expect: Expectation;
}

export interface NestingCheck {
  file: string;
  compare: "lte" | "gte";
  depth: number;
}

export interface LineCheck {
  file: string;
  compare: "lte" | "gte";
  lines: number;
}

export interface CheckSet {
  json?: JsonCheck;
  dotnetBuild?: DotnetCheck[];
  dotnetTest?: DotnetCheck[];
  npm?: NpmCheck[];
  answerFile?: string;
  answerGroups?: FindingGroup[];
  unchangedExcept?: string[];
  nesting?: NestingCheck[];
  lineCount?: LineCheck[];
  requireFile?: string[];
}

export interface FindingGroup {
  id: string;
  patterns: string[];
}

export interface ScoringRules {
  precisionMode?: "none" | "touch-list" | "max-files";
  allowedFiles?: string[];
  maxChangedFiles?: number;
  maxUnnecessaryFiles?: number;
  allowNewTests?: boolean;
  rootCausePatterns?: string[];
  requireRegressionTest?: boolean;
  weights?: Partial<ScoreWeights>;
  minGoldScore?: number;
}

export interface ScoreWeights {
  build: number;
  tests: number;
  hidden: number;
  findings: number;
  rootCause: number;
  precision: number;
  regressionTest: number;
  unchanged: number;
}

export interface TaskManifest {
  id: string;
  title: string;
  tier: number;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  languages: string[];
  summary: string;
  symptom?: string;
  rootCause?: string;
  correctFix?: string;
  promptFile: string;
  workspace: string;
  hidden: string;
  gold: string;
  hiddenCopy?: { from: string; to: string }[];
  checks: { initial: CheckSet; final: CheckSet };
  scoring: ScoringRules;
}

export interface LoadedTask {
  dir: string;
  manifest: TaskManifest;
}

const REQUIRED = ["id", "title", "tier", "category", "difficulty", "languages", "summary"] as const;

export function loadTasks(repoRoot: string, onlyId?: string): LoadedTask[] {
  const tasksDir = path.join(repoRoot, "tasks");
  if (!existsSync(tasksDir)) throw new Error(`Missing tasks directory: ${tasksDir}`);
  const ids = readdirSync(tasksDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !onlyId || name === onlyId)
    .sort();
  if (onlyId && ids.length === 0) throw new Error(`Task not found: ${onlyId}`);
  return ids.map((id) => {
    const dir = path.join(tasksDir, id);
    const manifestPath = path.join(dir, "task.json");
    if (!existsSync(manifestPath)) throw new Error(`${id}: missing task.json`);
    const raw = JSON.parse(readFileSync(manifestPath, "utf8")) as TaskManifest;
    for (const key of REQUIRED) {
      if (raw[key] === undefined || raw[key] === null || raw[key] === "") {
        throw new Error(`${id}: task.json missing ${key}`);
      }
    }
    if (raw.id !== id) throw new Error(`${id}: task.json id is ${raw.id}`);
    raw.promptFile ??= "prompt.md";
    raw.workspace ??= "workspace";
    raw.hidden ??= "hidden";
    raw.gold ??= "gold";
    raw.checks ??= { initial: {}, final: {} };
    raw.scoring ??= {};
    if (!existsSync(path.join(dir, raw.promptFile))) throw new Error(`${id}: missing ${raw.promptFile}`);
    if (!existsSync(path.join(dir, raw.workspace))) throw new Error(`${id}: missing workspace`);
    return { dir, manifest: raw };
  });
}

export function defaultWeights(category: string): ScoreWeights {
  if (category === "analysis" || category === "exploration" || category === "ambiguous") {
    return { build: 0, tests: 0, hidden: 0, findings: 60, rootCause: 0, precision: 0, regressionTest: 0, unchanged: 40 };
  }
  if (category === "refactor") {
    return { build: 15, tests: 25, hidden: 25, findings: 0, rootCause: 5, precision: 0, regressionTest: 0, unchanged: 30 };
  }
  return { build: 20, tests: 20, hidden: 25, findings: 10, rootCause: 10, precision: 15, regressionTest: 0, unchanged: 0 };
}
