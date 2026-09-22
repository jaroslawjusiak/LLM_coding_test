import path from "node:path";
import { copyTree, resetDir, writeText } from "./files.ts";
import type { LoadedTask } from "./manifest.ts";
import { readText } from "./files.ts";

export function packageTask(task: LoadedTask, outDir: string): string {
  const dest = path.join(outDir, task.manifest.id);
  resetDir(dest);
  const prompt = readText(path.join(task.dir, task.manifest.promptFile));
  writeText(path.join(dest, "PROMPT.md"), prompt);
  copyTree(path.join(task.dir, task.manifest.workspace), path.join(dest, "workspace"));
  writeText(
    path.join(dest, "HOW_TO_RUN.md"),
    [
      `# ${task.manifest.id} — ${task.manifest.title}`,
      "",
      "Give the model only this folder's PROMPT.md and workspace/.",
      "Do not give it the benchmark repository root, hidden tests, gold patch, or rubric.",
      "",
      "When the model finishes, score the edited workspace:",
      "",
      "```bash",
      `node harness/src/cli.ts score ${task.manifest.id} --workspace ${dest}/workspace --model <model-name>`,
      "```",
      "",
    ].join("\n"),
  );
  return dest;
}
