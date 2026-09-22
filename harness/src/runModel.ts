import path from "node:path";
import { parseFileBlocks, runCheckSet } from "./checks.ts";
import { relFiles, readText, writeText } from "./files.ts";
import type { LoadedTask } from "./manifest.ts";
import { rmSync } from "node:fs";

export interface RunModelOptions {
  baseUrl: string;
  model: string;
  apiKey?: string;
  maxTurns: number;
  maxChars: number;
  outDir: string;
}

export async function runModel(task: LoadedTask, options: RunModelOptions): Promise<string> {
  const workspace = path.join(options.outDir, "workspace");
  const { copyTree, resetDir } = await import("./files.ts");
  resetDir(options.outDir);
  copyTree(path.join(task.dir, task.manifest.workspace), workspace);
  const prompt = readText(path.join(task.dir, task.manifest.promptFile));
  const messages: { role: string; content: string }[] = [
    {
      role: "system",
      content: [
        "You are taking a local coding test. Change the project only as required.",
        "Return every changed or new file using this exact format, and write ANSWER.md the same way:",
        '<<<FILE path="relative/path.ext">>>',
        "full new file content",
        "<<<END FILE>>>",
        'Delete a file with <<<DELETE path="relative/path.ext">>>',
        "Do not wrap the blocks in markdown fences.",
      ].join("\n"),
    },
    { role: "user", content: `${prompt}\n\n${renderWorkspace(workspace, options.maxChars)}` },
  ];
  let last = "";
  for (let turn = 1; turn <= options.maxTurns; turn++) {
    last = await chat(options, messages);
    writeText(path.join(options.outDir, `turn-${turn}.txt`), last);
    const blocks = parseFileBlocks(last);
    if (blocks.writes.length === 0 && blocks.deletes.length === 0) {
      messages.push({ role: "assistant", content: last });
      messages.push({ role: "user", content: "No FILE blocks were found. Reply again using <<<FILE path=\"...\">>> blocks." });
      continue;
    }
    for (const rel of blocks.deletes) rmSync(path.join(workspace, rel), { force: true });
    for (const file of blocks.writes) {
      if (path.isAbsolute(file.path) || file.path.split(/[\\/]/).includes("..")) {
        throw new Error(`Refusing to write outside the workspace: ${file.path}`);
      }
      writeText(path.join(workspace, file.path), file.content);
    }
    const outcomes = await runCheckSet(workspace, task.manifest.checks.final, {
      hiddenDir: path.join(task.dir, task.manifest.hidden),
      manifest: task.manifest,
      originalWorkspace: path.join(task.dir, task.manifest.workspace),
    });
    const failed = outcomes.filter((item) => !item.ok);
    if (failed.length === 0 || turn === options.maxTurns) break;
    messages.push({ role: "assistant", content: last });
    messages.push({
      role: "user",
      content: `Checks still failing:\n${failed.map((item) => `## ${item.name}\n${item.detail}`).join("\n\n")}\n\nReturn corrected FILE blocks.`,
    });
  }
  return workspace;
}

function renderWorkspace(workspace: string, maxChars: number): string {
  const files = relFiles(workspace).filter((rel) => !rel.endsWith(".png") && !rel.endsWith(".jpg"));
  let used = 0;
  const parts = ["Project files:"];
  for (const rel of files) {
    const content = readText(path.join(workspace, rel));
    const block = `\n----- ${rel} -----\n${content}\n`;
    if (used + block.length > maxChars) {
      parts.push(`\n[truncated; ${files.length} files total, context budget reached at ${rel}]`);
      break;
    }
    parts.push(block);
    used += block.length;
  }
  return parts.join("");
}

async function chat(options: RunModelOptions, messages: { role: string; content: string }[]): Promise<string> {
  const response = await fetch(new URL("chat/completions", options.baseUrl.endsWith("/") ? options.baseUrl : `${options.baseUrl}/`), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(options.apiKey ? { authorization: `Bearer ${options.apiKey}` } : {}),
    },
    body: JSON.stringify({ model: options.model, temperature: 0, messages }),
  });
  if (!response.ok) throw new Error(`Model request failed: ${response.status} ${await response.text()}`);
  const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("Model response did not contain message content.");
  return content;
}
