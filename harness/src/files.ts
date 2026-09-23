import { createHash } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKIP_DIR = new Set(["node_modules", "bin", "obj", ".vs", "TestResults", "dist", "coverage"]);

export function repoRootFromHere(importMetaUrl: string): string {
  return path.resolve(path.dirname(fileURLToPath(importMetaUrl)), "..", "..");
}

export function walkFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const visit = (current: string) => {
    for (const entry of readdirSync(current)) {
      if (SKIP_DIR.has(entry)) continue;
      const full = path.join(current, entry);
      const stat = lstatSync(full);
      if (stat.isSymbolicLink()) continue;
      if (stat.isDirectory()) visit(full);
      else out.push(full);
    }
  };
  visit(dir);
  return out;
}

export function relFiles(dir: string): string[] {
  return walkFiles(dir)
    .map((file) => path.relative(dir, file).split(path.sep).join("/"))
    .sort();
}

export function readText(file: string): string {
  return readFileSync(file, "utf8");
}

export function writeText(file: string, content: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}

export function copyTree(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, {
    recursive: true,
    filter: (source) => {
      const base = path.basename(source);
      if (SKIP_DIR.has(base)) return false;
      return true;
    },
  });
}

export function resetDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

export function applyOverlay(overlayDir: string, workspaceDir: string): string[] {
  if (!existsSync(overlayDir)) return [];
  const applied: string[] = [];
  const deleteList = path.join(overlayDir, "delete.txt");
  if (existsSync(deleteList)) {
    for (const line of readText(deleteList).split(/\r?\n/)) {
      const rel = line.trim();
      if (!rel || rel.startsWith("#")) continue;
      rmSync(path.join(workspaceDir, rel), { recursive: true, force: true });
      applied.push(`delete:${rel}`);
    }
  }
  for (const file of walkFiles(overlayDir)) {
    const rel = path.relative(overlayDir, file).split(path.sep).join("/");
    if (rel === "delete.txt" || rel === "RUBRIC.md" || rel.endsWith("/RUBRIC.md")) continue;
    const target = path.join(workspaceDir, rel);
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(file, target);
    applied.push(rel);
  }
  return applied;
}

export function copyHidden(hiddenDir: string, workspaceDir: string, copies?: { from: string; to: string }[]): void {
  if (!existsSync(hiddenDir)) return;
  if (copies && copies.length > 0) {
    for (const item of copies) {
      const src = path.join(hiddenDir, item.from);
      const dest = path.join(workspaceDir, item.to);
      mkdirSync(path.dirname(dest), { recursive: true });
      cpSync(src, dest);
    }
    return;
  }
  for (const file of walkFiles(hiddenDir)) {
    const rel = path.relative(hiddenDir, file);
    const dest = path.join(workspaceDir, rel);
    mkdirSync(path.dirname(dest), { recursive: true });
    cpSync(file, dest);
  }
}

export function sha256(text: string): string {
  return createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");
}

export function fileExists(file: string): boolean {
  return existsSync(file) && statSync(file).isFile();
}

export function findUp(start: string, fileName: string): string | null {
  let dir = start;
  while (true) {
    const candidate = path.join(dir, fileName);
    if (existsSync(candidate)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
