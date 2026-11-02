import { expect, test } from "bun:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:net";

import { serveOwnedHttpProcess } from "../../src/runtime/owned-http-process.mjs";

const reservePort = async () => {
  const probe = createServer();
  const listening = once(probe, "listening");
  probe.listen(0, "127.0.0.1");
  await listening;
  const address = probe.address();
  // eslint-disable-next-line anti-slop/no-runtime-typeof -- Node's TCP/pipe boundary returns an address union; the fixture requires the allocated TCP port.
  assert.ok(address !== null && typeof address !== "string");
  const closed = once(probe, "close");
  probe.close();
  await closed;

  return address.port;
};

test("owned HTTP process waits for a response and closes its listener", async () => {
  const port = await reservePort();

  const server = await serveOwnedHttpProcess({
    args: [
      "-e",
      `Bun.serve({ hostname: '127.0.0.1', port: ${port}, fetch: () => new Response('owned') }); console.log('Listening');`,
    ],
    cwd: process.cwd(),
    env: process.env,
    label: "test HTTP server",
    port,
    readyText: "Listening",
    startupTimeout: 5000,
  });

  const response = await fetch(server.url);
  expect(await response.text()).toBe("owned");
  await Promise.all([server.close(), server.close()]);
  await server.close();
  await assert.rejects(fetch(server.url));
});

test("failed spawn rejects instead of waiting for an exit event that cannot occur", async () => {
  await assert.rejects(
    serveOwnedHttpProcess({
      args: ["-e", ""],
      cwd: `${process.cwd()}/missing-owned-process-test-directory`,
      env: process.env,
      label: "invalid cwd fixture",
      port: 1,
      readyText: "Listening",
      startupTimeout: 500,
    })
  );
}, 1000);

test("startup timeout releases the owned listener", async () => {
  const port = await reservePort();
  await assert.rejects(
    serveOwnedHttpProcess({
      args: [
        "-e",
        `Bun.serve({ hostname: '127.0.0.1', port: ${port}, fetch: () => new Response('owned') });`,
      ],
      cwd: process.cwd(),
      env: process.env,
      label: "unready fixture",
      port,
      readyText: "Never printed",
      startupTimeout: 300,
    }),
    /timed out/u
  );
  await assert.rejects(fetch(`http://127.0.0.1:${port}`));
});

test("owned process early exit rejects readiness with captured diagnostics", async () => {
  await assert.rejects(
    serveOwnedHttpProcess({
      args: ["-e", "console.error('fixture failure'); process.exit(7)"],
      cwd: process.cwd(),
      env: process.env,
      label: "failed fixture",
      port: 1,
      readyText: "Listening",
      startupTimeout: 5000,
    }),
    /fixture failure/u
  );
});
