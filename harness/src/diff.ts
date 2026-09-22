import path from "node:path";
import { readText, relFiles } from "./files.ts";

export interface FileChange {
  path: string;
  status: "added" | "removed" | "modified";
  added: number;
  removed: number;
}

export interface DiffSummary {
  files: FileChange[];
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
}

export function lineDiffCounts(before: string, after: string): { added: number; removed: number } {
  const a = before.replace(/\r\n/g, "\n").split("\n");
  const b = after.replace(/\r\n/g, "\n").split("\n");
  if (a.length * b.length > 2_000_000) {
    return approximateLineDiff(a, b);
  }
  const lcs = lcsLength(a, b);
  return { removed: a.length - lcs, added: b.length - lcs };
}

function approximateLineDiff(a: string[], b: string[]): { added: number; removed: number } {
  const counts = new Map<string, number>();
  for (const line of a) counts.set(line, (counts.get(line) ?? 0) + 1);
  let shared = 0;
  for (const line of b) {
    const n = counts.get(line) ?? 0;
    if (n > 0) {
      counts.set(line, n - 1);
      shared++;
    }
  }
  return { removed: a.length - shared, added: b.length - shared };
}

function lcsLength(a: string[], b: string[]): number {
  let prev = new Array<number>(b.length + 1).fill(0);
  let curr = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      curr[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], curr[j - 1]);
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }
  return prev[b.length];
}

export function diffTrees(originalDir: string, modifiedDir: string): DiffSummary {
  const original = new Set(relFiles(originalDir));
  const modified = new Set(relFiles(modifiedDir));
  const files: FileChange[] = [];
  for (const rel of original) {
    if (!modified.has(rel)) files.push({ path: rel, status: "removed", added: 0, removed: countLines(path.join(originalDir, rel)) });
  }
  for (const rel of modified) {
    if (!original.has(rel)) {
      files.push({ path: rel, status: "added", added: countLines(path.join(modifiedDir, rel)), removed: 0 });
      continue;
    }
    const before = readText(path.join(originalDir, rel));
    const after = readText(path.join(modifiedDir, rel));
    if (before.replace(/\r\n/g, "\n") === after.replace(/\r\n/g, "\n")) continue;
    const counts = lineDiffCounts(before, after);
    files.push({ path: rel, status: "modified", ...counts });
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  return {
    files,
    filesChanged: files.length,
    linesAdded: files.reduce((sum, file) => sum + file.added, 0),
    linesRemoved: files.reduce((sum, file) => sum + file.removed, 0),
  };
}

function countLines(file: string): number {
  try {
    return readText(file).replace(/\r\n/g, "\n").split("\n").length;
  } catch {
    return 0;
  }
}

export function maxIndentDepth(source: string): number {
  let max = 0;
  for (const line of source.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const match = /^( +|\t+)/.exec(line);
    if (!match) continue;
    const depth = match[1].includes("\t") ? match[1].length : Math.floor(match[1].length / 4);
    if (depth > max) max = depth;
  }
  return max;
}

export function isTestPath(rel: string): boolean {
  const lower = rel.toLowerCase();
  return (
    lower.includes("/test") ||
    lower.includes(".test.") ||
    lower.includes("tests.cs") ||
    lower.endsWith("tests.cs") ||
    lower.includes("spec.")
  );
}

export function matchGroups(text: string, groups: { id: string; patterns: string[] }[] | undefined): { matched: string[]; missed: string[] } {
  const matched: string[] = [];
  const missed: string[] = [];
  for (const group of groups ?? []) {
    const ok = group.patterns.some((pattern) => new RegExp(pattern, "i").test(text));
    (ok ? matched : missed).push(group.id);
  }
  return { matched, missed };
}
