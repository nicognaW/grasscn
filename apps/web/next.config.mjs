import { createMDX } from "fumadocs-mdx/next"
import { fileURLToPath } from "node:url"

const withMDX = createMDX({})
const workspaceRoot = fileURLToPath(new URL("../../", import.meta.url))

export default withMDX({
  agentRules: false,
  devIndicators: false,
  experimental: { cpus: 1 },
  turbopack: { root: workspaceRoot },
  outputFileTracingRoot: workspaceRoot,
})
