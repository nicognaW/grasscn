import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

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
}) => {
  const child = spawn(process.execPath, args, {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let logs = "";
  /** @type {Error | undefined} */
  let failure;

  /** @param {Buffer} bytes - Owned process output. */
  const stdout = (bytes) => {
    logs += bytes.toString("utf-8");
    process.stdout.write(bytes);
  };

  /** @param {Buffer} bytes - Owned process diagnostics. */
  const stderr = (bytes) => {
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
    await new Promise((resolve) => {
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
  let closing;

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
          // eslint-disable-next-line no-await-in-loop -- One bounded readiness probe at a time.
          const response = await fetch(url, {
            signal: AbortSignal.timeout(2500),
          });

          const ready = response.ok;
          // eslint-disable-next-line no-await-in-loop -- Release each response before retrying.
          await response.body?.cancel();

          if (ready) {
            return { close, pid: child.pid, url };
          }
        } catch {
          // Retry startup connection failures until the caller's deadline.
        }
      }

      // eslint-disable-next-line no-await-in-loop -- Readiness is sequential and deadline bounded.
      await delay(100);
    }

    throw new Error(`Owned ${label} readiness timed out: ${logs}`);
  } catch (error) {
    await close();
    throw error;
  }
};
