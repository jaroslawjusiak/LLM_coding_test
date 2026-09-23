import os from "node:os";
import path from "node:path";
import { runCheckSet } from "./checks.ts";
import { applyOverlay, copyTree, resetDir } from "./files.ts";
import type { LoadedTask } from "./manifest.ts";
import { commandExists } from "./process.ts";
import { renderReport, scoreSubmission } from "./score.ts";

export interface VerifyOptions {
  allowMissingDotnet?: boolean;
  skipExecute?: boolean;
}

export async function verifyTask(task: LoadedTask, options: VerifyOptions = {}): Promise<{ ok: boolean; log: string }> {
  const started = Date.now();
  const lines: string[] = [];
  const manifest = task.manifest;
  const workspace = path.join(task.dir, manifest.workspace);
  const hidden = path.join(task.dir, manifest.hidden);
  const gold = path.join(task.dir, manifest.gold);
  const needsDotnet = JSON.stringify(manifest.checks).includes("dotnet");
  if (needsDotnet && !(await commandExists("dotnet"))) {
    const message = `${manifest.id}: dotnet SDK is not on PATH`;
    if (options.allowMissingDotnet || options.skipExecute) {
      lines.push(`SKIP ${message}`);
      return { ok: true, log: lines.join("\n") };
    }
    return { ok: false, log: message };
  }
  if (options.skipExecute) return { ok: true, log: `${manifest.id}: structural ok` };

  const tempRoot = path.join(os.tmpdir(), "llm-coding-test", `${manifest.id}-${process.pid}-${Date.now()}`);
  const initialDir = path.join(tempRoot, "initial");
  const finalDir = path.join(tempRoot, "final");
  try {
    resetDir(tempRoot);
    copyTree(workspace, initialDir);
    copyTree(workspace, finalDir);
    const initial = await runCheckSet(initialDir, manifest.checks.initial, { hiddenDir: hidden, manifest, originalWorkspace: workspace });
    const skipped = initial.filter((outcome) => outcome.skipped);
    if (skipped.length > 0) {
      const tools = [...new Set(skipped.map((outcome) => outcome.tool))].join(", ");
      const message = `${manifest.id}: ${tools} is not on PATH, ${skipped.length} check(s) could not run`;
      if (options.allowMissingDotnet) return { ok: true, log: `SKIP ${message}` };
      return { ok: false, log: `FAIL ${message}` };
    }
    for (const outcome of initial) {
      lines.push(`${outcome.ok ? "ok" : "FAIL"} initial ${outcome.name}`);
      if (!outcome.ok) lines.push(outcome.detail);
    }
    applyOverlay(gold, finalDir);
    const final = await runCheckSet(finalDir, manifest.checks.final, { hiddenDir: hidden, manifest, originalWorkspace: workspace });
    for (const outcome of final) {
      lines.push(`${outcome.ok ? "ok" : "FAIL"} final ${outcome.name}`);
      if (!outcome.ok) lines.push(outcome.detail);
    }
    const report = scoreSubmission(task, workspace, finalDir, final, initial, "gold", Date.now() - started);
    const minimum = manifest.scoring.minGoldScore ?? report.maxScore;
    if (report.score < minimum) {
      lines.push(`FAIL gold score ${report.score}/${report.maxScore} < ${minimum}`);
      lines.push(renderReport(report));
    } else {
      lines.push(`ok gold score ${report.score}/${report.maxScore}`);
    }
    const ok = initial.every((item) => item.ok) && final.every((item) => item.ok) && report.score >= minimum;
    return { ok, log: lines.join("\n") };
  } finally {
    const { rmSync } = await import("node:fs");
    rmSync(tempRoot, { recursive: true, force: true });
  }
}
