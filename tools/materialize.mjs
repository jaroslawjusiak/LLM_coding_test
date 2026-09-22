import { flush } from "./lib.mjs";
import { syntaxTasks } from "./tasks-syntax.mjs";
import { buildTasks } from "./tasks-build.mjs";
import { bugTasks } from "./tasks-bugs.mjs";
import { specTasks } from "./tasks-spec.mjs";
import { featTasks } from "./tasks-feat.mjs";
import { restTasks } from "./tasks-rest.mjs";

syntaxTasks();
buildTasks();
bugTasks();
specTasks();
featTasks();
restTasks();
const count = await flush();
console.log(`wrote ${count} files`);
