import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

interface OwnedHttpProcessOptions {
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  label: string;
  port: number;
  readyText: string;
  startupTimeout: number;
}

/**
 * Own one Bun HTTP process from startup through shutdown. Callers validate domain identity first.
 * @param {{args: string[], cwd: string, env: NodeJS.ProcessEnv, label: string, port: number, readyText: string, startupTimeout: number}} options - Listener configuration.
 */
export const serveOwnedHttpProcess = async ({
  args,
  cwd,
  env,
  label,
  port,
  readyText,
  startupTimeout,
}: OwnedHttpProcessOptions) => {
  const child = spawn(process.execPath, args, {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let logs = "";
  /** @type {Error | undefined} */
  let failure: Error | undefined;

  /** @param {Buffer} bytes - Owned process output. */
  const stdout = (bytes: Buffer) => {
    logs += bytes.toString("utf-8");
    process.stdout.write(bytes);
  };

  /** @param {Buffer} bytes - Owned process diagnostics. */
  const stderr = (bytes: Buffer) => {
    logs += bytes.toString("utf-8");
    process.stderr.write(bytes);
  };

  child.stdout.on("data", stdout);
  child.stderr.on("data", stderr);
  child.on("error", (error) => {
    failure = error;
  });

  const stop = async () => {
    if (
      child.pid === undefined ||
      child.exitCode !== null ||
      child.signalCode !== null
    ) {
      return;
    }

    // eslint-disable-next-line promise/avoid-new -- Await the owned child process exit before releasing its listener.
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
      }, 5000);

      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
      child.kill();
    });
  };

  /** @type {Promise<void> | undefined} */
  let closing: Promise<void> | undefined;

  const close = async () => {
    closing ??= stop();

    await closing;
  };

  const url = `http://127.0.0.1:${port}`;

  try {
    const deadline = Date.now() + startupTimeout;

    while (Date.now() < deadline) {
      if (failure) {
        throw failure;
      }

      if (child.exitCode !== null || child.signalCode !== null) {
        throw new Error(
          `Owned ${label} exited before readiness (${child.exitCode ?? child.signalCode}): ${logs}`
        );
      }

      if (logs.includes(readyText)) {
        try {
          const response = await fetch(url, {
            signal: AbortSignal.timeout(2500),
          });

          const ready = response.ok;
          await response.body?.cancel();

          if (ready) {
            return { close, pid: child.pid, url };
          }
        } catch {
          // Retry startup connection failures until the caller's deadline.
        }
      }

      await delay(100);
    }

    throw new Error(`Owned ${label} readiness timed out: ${logs}`);
  } catch (error) {
    await close();
    throw error;
  }
};
