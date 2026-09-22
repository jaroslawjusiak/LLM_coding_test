import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export const repoRoot = path.resolve(import.meta.dirname, "..");
const files = new Map();

export function add(rel, content) {
  const text = content.replace(/\r\n/g, "\n");
  files.set(rel, text.endsWith("\n") ? text : `${text}\n`);
}

export function flush() {
  for (const [rel, content] of files) {
    const full = path.join(repoRoot, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return files.size;
}

export function csproj(extra = "") {
  return `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
${extra}</Project>
`;
}

export function webproj(extra = "") {
  return `<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
${extra}</Project>
`;
}

export function testproj(refs, extra = "") {
  const references = refs.map((r) => `    <ProjectReference Include="${r}" />`).join("\n");
  return `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
  </PropertyGroup>
  <ItemGroup>
    <Using Include="Xunit" />
  </ItemGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.11.1" />
    <PackageReference Include="xunit" Version="2.9.2" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.8.2" />
  </ItemGroup>
  <ItemGroup>
${references}
  </ItemGroup>
${extra}</Project>
`;
}

export function sln(name, projects) {
  const body = projects
    .map(
      (project) =>
        `Project("{9A19103F-16F7-4668-BE54-9A1E7A4F7556}") = "${project.name}", "${project.path}", "{${project.guid}}"\nEndProject`,
    )
    .join("\n");
  const configs = projects
    .map(
      (project) =>
        `\t\t{${project.guid}}.Debug|Any CPU.ActiveCfg = Debug|Any CPU\n\t\t{${project.guid}}.Debug|Any CPU.Build.0 = Debug|Any CPU`,
    )
    .join("\n");
  return `Microsoft Visual Studio Solution File, Format Version 12.00
# Visual Studio Version 17
${body}
Global
	GlobalSection(SolutionConfigurationPlatforms) = preSolution
		Debug|Any CPU = Debug|Any CPU
	EndGlobalSection
	GlobalSection(ProjectConfigurationPlatforms) = postSolution
${configs}
	EndGlobalSection
EndGlobal
`;
}

export function manifest(task) {
  add(`tasks/${task.id}/task.json`, JSON.stringify(task, null, 2));
}

export function prompt(id, title, body) {
  add(
    `tasks/${id}/prompt.md`,
    `# ${title}

${body.trim()}

The project to edit is this workspace. Do not assume any files exist outside it.

When you finish, write \`ANSWER.md\` at the workspace root. State the root cause, what you changed, and what you deliberately left alone.
`,
  );
}

export function rubric(id, body) {
  add(`tasks/${id}/RUBRIC.md`, body.trim() + "\n");
}

export function reactPackage(name) {
  return JSON.stringify(
    {
      name,
      private: true,
      type: "module",
      scripts: {
        build: "tsc --noEmit",
        test: "vitest run",
      },
      dependencies: {
        react: "18.3.1",
        "react-dom": "18.3.1",
      },
      devDependencies: {
        "@types/react": "18.3.18",
        "@types/react-dom": "18.3.5",
        typescript: "5.7.3",
        vitest: "2.1.8",
      },
    },
    null,
    2,
  );
}

export function reactConfig() {
  return {
    "tsconfig.json": `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests"]
}
`,
    "vitest.config.ts": `import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
});
`,
  };
}

let guidN = 1;
export function guid(n = guidN++) {
  const hex = n.toString(16).padStart(12, "0");
  return `A0000000-0000-4000-8000-${hex}`;
}
