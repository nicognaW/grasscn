import { fileURLToPath } from "node:url";

import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX({});
const workspaceRoot = fileURLToPath(new URL("../../", import.meta.url));

export default withMDX({
  agentRules: false,
  devIndicators: false,
  // Shiki is used by the client code viewer; bundle it rather than externalizing Bun's isolated package alias.
  transpilePackages: ["shiki"],
  experimental: {
    cpus: 1,
    // Fumadocs customizes Webpack; release each compiler heap before prerendering.
    webpackBuildWorker: true,
    // Share loader runtimes across MDX/PostCSS work within the local build budget.
    turbopackPluginRuntimeStrategy: "workerThreads",
  },
  turbopack: { root: workspaceRoot },
  outputFileTracingRoot: workspaceRoot,
});
