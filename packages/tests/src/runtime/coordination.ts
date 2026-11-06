import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { repoRoot } from "@tests/paths";

const json = (value: { pid: number; start: string | null | undefined }) =>
  `${JSON.stringify(value, null, 2)}\n`;

const git = (args: string[]) =>
  execFileSync("git", args, { cwd: repoRoot, encoding: "utf-8" }).trim();

export const coordinationRoot = function coordinationRoot() {
  return path.join(
    path.resolve(repoRoot, git(["rev-parse", "--git-common-dir"])),
    "grasscn-verification"
  );
};

export const processIdentity = function processIdentity(pid: number) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return null;
  }

  try {
    if (process.platform === "win32") {
      return execFileSync(
        "powershell",
        [
          "-NoProfile",
          "-Command",
          `(Get-Process -Id ${pid} -ErrorAction Stop).StartTime.ToUniversalTime().ToString('o')`,
        ],
        { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }
      ).trim();
    }

    return fs
      .readFileSync(`/proc/${pid}/stat`, "utf-8")
      .slice(fs.readFileSync(`/proc/${pid}/stat`, "utf-8").lastIndexOf(")") + 2)
      .split(" ")[19];
  } catch {
    return null;
  }
};

export const foregroundLease = function foregroundLease() {
  const directory = path.join(coordinationRoot(), "foreground");
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, `${process.pid}-${randomUUID()}.json`);
  fs.writeFileSync(
    file,
    json({ pid: process.pid, start: processIdentity(process.pid) }),
    { flag: "wx" }
  );

  return () => {
    fs.rmSync(file, { force: true });
  };
};
