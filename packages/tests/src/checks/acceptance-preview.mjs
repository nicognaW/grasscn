import { serveNextProduction, sourceIdentity } from "./next-production.mjs";

// Run in the resource guard after the final root Turbo build. The caller owns
// the lifetime; Ctrl+C closes this snapshot rather than leaving a stale server.
const source = await sourceIdentity();
const host = await serveNextProduction({
  port: Number(process.env.GRASSCN_ACCEPTANCE_PORT ?? 5176),
  expectedSource: source,
});
const identity = host.identity;
console.log(
  JSON.stringify({
    url: host.url,
    source: identity.source,
    buildId: identity.buildId,
    outputSha256: identity.outputSha256,
    pid: host.identity.pid,
    bun: Bun.version,
  })
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, async () => {
    await host.close();
    process.exit(0);
  });
await new Promise(() => {});
