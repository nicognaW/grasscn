import { fileURLToPath } from "node:url";

import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX({});
const workspaceRoot = fileURLToPath(new URL("../../", import.meta.url));

const configureWebpack = <Config extends { cache?: boolean | object }>(
  config: Config,
  { dev }: { dev: boolean }
) => {
  // Serializing the large development pack retains duplicate source buffers.
  if (dev) {
    config.cache = false;
  }

  return config;
};

export default withMDX({
  agentRules: false,
  devIndicators: false,
  experimental: {
    cpus: 1,
    // Share loader runtimes across MDX/PostCSS work within the local build budget.
    turbopackPluginRuntimeStrategy: "workerThreads",
    // Fumadocs customizes Webpack; release each compiler heap before prerendering.
    webpackBuildWorker: true,
  },
  outputFileTracingRoot: workspaceRoot,
  // Shiki is used by the client code viewer; bundle it rather than externalizing Bun's isolated package alias.
  transpilePackages: ["shiki"],
  turbopack: { root: workspaceRoot },
  webpack: configureWebpack,
});
