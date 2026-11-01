import {
  serveNextProduction,
  sourceIdentity,
} from "@grasscn/tests/next-production";

// Run in the resource guard after the final root Turbo build. The caller owns
// the lifetime; Ctrl+C closes this snapshot rather than leaving a stale server.
const source = await sourceIdentity();

const host = await serveNextProduction({
  expectedSource: source,
  port: Number(process.env.GRASSCN_ACCEPTANCE_PORT ?? 5176),
});

const { identity } = host;

console.log(
  JSON.stringify({
    buildId: identity.buildId,
    bun: Bun.version,
    outputSha256: identity.outputSha256,
    pid: host.identity.pid,
    source: identity.source,
    url: host.url,
  })
);

const closePreview = async () => {
  try {
    await host.close();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    void closePreview();
  });
}

// oxlint-disable-next-line promise/avoid-new -- The caller owns this persistent server until a process signal closes it.
await new Promise(() => {
  // Signal handlers terminate this deliberately persistent preview session.
});
