import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Do not load the workload until the parent has assigned our process to its job.
const [gate, target, ...args] = process.argv.slice(2);
if (!gate || !target)
  throw new Error("Expected a budget gate and target script");
const deadline = Date.now() + 10_000;
let admitted = false;
while (Date.now() < deadline) {
  try {
    const budget = JSON.parse(await fs.readFile(gate, "utf8"));
    if (budget.pid !== process.pid || budget.enforced !== true)
      throw new Error("Budget gate identity mismatch");
    admitted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
  }
  await new Promise((resolve) => setTimeout(resolve, 25));
}
if (!admitted)
  throw new Error("Timed out waiting for enforced process budgets");
process.argv = [process.execPath, path.resolve(target), ...args];
await import(pathToFileURL(path.resolve(target)).href);
