import { spawn } from "node:child_process";

export interface ProcessResult {
  code: number;
  output: string;
  timedOut: boolean;
  /** True when the executable itself could not be spawned (not on PATH). */
  missing?: boolean;
}

export function runProcess(command: string, args: string[], cwd: string, timeoutMs = 180_000, extraEnv: Record<string, string> = {}): Promise<ProcessResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...extraEnv },
      stdio: ["ignore", "pipe", "pipe"],
      // Node refuses to spawn .cmd/.bat files on Windows without a shell (CVE-2024-27980).
      shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(command),
    });
    let output = "";
    const append = (chunk: Buffer) => {
      output += chunk.toString("utf8");
      if (output.length > 400_000) output = output.slice(-300_000);
    };
    child.stdout?.on("data", append);
    child.stderr?.on("data", append);
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timer);
      const missing = (error as NodeJS.ErrnoException).code === "ENOENT";
      resolve({ code: 127, output: output + `\n${error.message}`, timedOut, missing });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, output, timedOut });
    });
  });
}

export function commandExists(command: string): Promise<boolean> {
  return runProcess(process.platform === "win32" ? "where" : "which", [command], process.cwd(), 10_000).then((result) => result.code === 0);
}

export const DOTNET_ENV = {
  DOTNET_CLI_TELEMETRY_OPTOUT: "1",
  DOTNET_NOLOGO: "1",
  NUGET_XMLDOC_MODE: "skip",
  // The test and build summaries are parsed in English. A localized CLI prints
  // "Zaliczono: 5" instead of "Passed: 5" and the parser reads zero tests.
  DOTNET_CLI_UI_LANGUAGE: "en",
};

export const NPM_ENV = {
  npm_config_fund: "false",
  npm_config_audit: "false",
  npm_config_update_notifier: "false",
};

export function npmCommand(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

export function tail(text: string, lines = 60): string {
  return text.trim().split(/\r?\n/).slice(-lines).join("\n");
}
