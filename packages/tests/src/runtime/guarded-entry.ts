import fs from "node:fs/promises";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { pathToFileURL } from "node:url";

const isPendingBudgetGate = (
  error: unknown
): error is NodeJS.ErrnoException | SyntaxError =>
  error instanceof SyntaxError ||
  (error instanceof Error && "code" in error && error.code === "ENOENT");

// Do not load the workload until the parent has assigned our process to its job.
const [gate, target, ...args] = process.argv.slice(2);

if (!gate || !target) {
  throw new Error("Expected a budget gate and target script");
}

const deadline = Date.now() + 10_000;
let admitted = false;

while (Date.now() < deadline) {
  try {
    // SAFETY: the parent writes this process budget receipt; existing pid/enforced guards remain unchanged.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Consume the enforced-budget writer contract without adding runtime validation.
    const budget = JSON.parse(await fs.readFile(gate, "utf-8")) as {
      pid: number;
      enforced?: boolean;
    };

    if (budget.pid !== process.pid || budget.enforced !== true) {
      throw new Error("Budget gate identity mismatch");
    }

    admitted = true;
    break;
  } catch (error) {
    if (!isPendingBudgetGate(error)) {
      throw error;
    }
  }

  await setTimeout(25);
}

if (!admitted) {
  throw new Error("Timed out waiting for enforced process budgets");
}

process.argv = [process.execPath, path.resolve(target), ...args];

await import(pathToFileURL(path.resolve(target)).href);
