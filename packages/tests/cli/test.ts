import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { foregroundLease } from "@grasscn/tests/coordination";
import { packageBin } from "@grasscn/tests/tooling";
import { testRoot } from "@tests/paths";

const args = process.argv.slice(2);
const releaseForeground = foregroundLease();

const execute = (command: string[]) => {
  const result = spawnSync(process.execPath, command, {
    cwd: testRoot,
    env: { ...process.env, GRASSCN_BROWSER_SCOPE: "ordinary" },
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 1;
};

try {
  const units = fs
    .readdirSync(path.join(testRoot, "tests/unit"))
    .filter((name) => name.endsWith(".test.ts"))
    .map((name) => path.join(testRoot, "tests/unit", name));

  const unitStatus = args.includes("--list")
    ? 0
    : execute(["test", "--timeout", "120000", ...units]);

  process.exitCode =
    unitStatus ||
    execute([
      packageBin("@playwright/test", "playwright", testRoot),
      "test",
      "--config",
      path.join(testRoot, "playwright.config.ts"),
      ...args,
    ]);
} finally {
  releaseForeground();
}
