import path from "node:path";
import { parseArgs } from "node:util";
import { runCheckSet } from "./checks.ts";
import { repoRootFromHere, writeText } from "./files.ts";
import { loadTasks } from "./manifest.ts";
import { packageTask } from "./packageTask.ts";
import { runModel } from "./runModel.ts";
import { renderReport, scoreSubmission } from "./score.ts";
import { verifyTask } from "./verify.ts";
import { copyTree } from "./files.ts";
import os from "node:os";

const repoRoot = process.env.LLM_CODING_TEST_ROOT ?? repoRootFromHere(import.meta.url);

const { positionals, values } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    out: { type: "string" },
    workspace: { type: "string" },
    model: { type: "string", default: "unspecified" },
    report: { type: "string" },
    task: { type: "string" },
    "base-url": { type: "string" },
    "api-key": { type: "string" },
    "max-turns": { type: "string", default: "4" },
    "max-chars": { type: "string", default: "120000" },
    "skip-baseline": { type: "boolean", default: false },
    "allow-missing-dotnet": { type: "boolean", default: false },
    "skip-execute": { type: "boolean", default: false },
    markdown: { type: "boolean", default: false },
    "use-gold": { type: "boolean", default: false },
  },
});

const command = positionals[0] ?? "help";

if (command === "help" || values.help) {
  console.log(`Usage:
  node harness/src/cli.ts list [--markdown]
  node harness/src/cli.ts package <task-id> --out <dir>
  node harness/src/cli.ts score <task-id> --workspace <dir> [--model name] [--report file] [--use-gold] [--skip-baseline]
  node harness/src/cli.ts verify [--task <id>] [--allow-missing-dotnet] [--skip-execute]
  node harness/src/cli.ts run <task-id> --base-url <openai-compatible-url> --model <name> --out <dir>

Give a model only the packaged PROMPT.md and workspace/. Never point it at the repository root.
`);
  process.exit(0);
}

if (command === "list") {
  const tasks = loadTasks(repoRoot);
  if (values.markdown) {
    console.log("| ID | Title | Tier | Difficulty | Languages | Category |");
    console.log("| --- | --- | --- | --- | --- | --- |");
    for (const task of tasks) {
      const m = task.manifest;
      console.log(`| ${m.id} | ${m.title} | ${m.tier} | ${m.difficulty} | ${m.languages.join(", ")} | ${m.category} |`);
    }
  } else {
    for (const task of tasks) {
      const m = task.manifest;
      console.log(`${m.id}\tT${m.tier}\t${m.difficulty}\t${m.languages.join("+")}\t${m.title}`);
    }
  }
  process.exit(0);
}

if (command === "package") {
  const id = positionals[1];
  if (!id || !values.out) fail("package requires <task-id> and --out");
  const dest = packageTask(loadTasks(repoRoot, id)[0], values.out);
  console.log(dest);
  process.exit(0);
}

if (command === "verify") {
  const tasks = loadTasks(repoRoot, values.task);
  let failed = 0;
  for (const task of tasks) {
    process.stdout.write(`verify ${task.manifest.id} ... `);
    const result = await verifyTask(task, {
      allowMissingDotnet: values["allow-missing-dotnet"],
      skipExecute: values["skip-execute"],
    });
    console.log(result.ok ? "PASS" : "FAIL");
    if (!result.ok) {
      failed++;
      console.error(result.log);
    }
  }
  console.log(`${tasks.length - failed}/${tasks.length} tasks verified`);
  process.exit(failed === 0 ? 0 : 1);
}

if (command === "score") {
  const id = positionals[1];
  if (!id) fail("score requires <task-id>");
  const task = loadTasks(repoRoot, id)[0];
  const started = Date.now();
  const original = path.join(task.dir, task.manifest.workspace);
  let workspace = values.workspace;
  if (values["use-gold"]) {
    workspace = path.join(os.tmpdir(), "llm-coding-test-gold", id);
    const { applyOverlay, resetDir } = await import("./files.ts");
    resetDir(workspace);
    copyTree(original, workspace);
    applyOverlay(path.join(task.dir, task.manifest.gold), workspace);
  }
  if (!workspace) fail("score requires --workspace or --use-gold");
  const initial = values["skip-baseline"]
    ? []
    : await runCheckSet(original, task.manifest.checks.initial, { manifest: task.manifest, originalWorkspace: original });
  const final = await runCheckSet(workspace, task.manifest.checks.final, {
    hiddenDir: path.join(task.dir, task.manifest.hidden),
    manifest: task.manifest,
    originalWorkspace: original,
  });
  const report = scoreSubmission(task, original, workspace, final, initial, values.model ?? "unspecified", Date.now() - started);
  const markdown = renderReport(report);
  if (report.environment.length > 0) console.error(`WARNING: ${report.environment.join("; ")}`);
  console.log(markdown);
  if (values.report) {
    writeText(values.report, JSON.stringify(report, null, 2) + "\n");
    writeText(values.report.replace(/\.json$/i, ".md"), markdown);
  }
  process.exit(0);
}

if (command === "run") {
  const id = positionals[1];
  if (!id || !values["base-url"] || !values.model || !values.out) fail("run requires <task-id> --base-url --model --out");
  const task = loadTasks(repoRoot, id)[0];
  const started = Date.now();
  const workspace = await runModel(task, {
    baseUrl: values["base-url"],
    model: values.model,
    apiKey: values["api-key"],
    maxTurns: Number(values["max-turns"]),
    maxChars: Number(values["max-chars"]),
    outDir: values.out,
  });
  const original = path.join(task.dir, task.manifest.workspace);
  const final = await runCheckSet(workspace, task.manifest.checks.final, {
    hiddenDir: path.join(task.dir, task.manifest.hidden),
    manifest: task.manifest,
    originalWorkspace: original,
  });
  const report = scoreSubmission(task, original, workspace, final, [], values.model, Date.now() - started);
  if (report.environment.length > 0) console.error(`WARNING: ${report.environment.join("; ")}`);
  console.log(renderReport(report));
  writeText(path.join(values.out, "report.json"), JSON.stringify(report, null, 2) + "\n");
  writeText(path.join(values.out, "report.md"), renderReport(report));
  process.exit(0);
}

fail(`Unknown command: ${command}`);

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}
