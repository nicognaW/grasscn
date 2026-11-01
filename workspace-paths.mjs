import path from 'node:path'
import fs from 'node:fs'
import {fileURLToPath} from 'node:url'
import {createRequire} from 'node:module'

export const repoRoot = path.dirname(fileURLToPath(import.meta.url))
export const repositoryRoot = repoRoot
export const webRoot = fs.existsSync(path.join(repoRoot, 'apps/web')) ? path.join(repoRoot, 'apps/web') : repoRoot
export const testRoot = fs.existsSync(path.join(repoRoot, 'packages/tests')) ? path.join(repoRoot, 'packages/tests') : repoRoot

// Manifests keep their historical names; moving files does not change provenance.
// Explicit fixture roots are isolated and must never fall back to repository files.
export function resolveRepositoryPath(name, base = repoRoot) {
  if (path.isAbsolute(name)) return name
  if (path.resolve(base) !== repoRoot && path.resolve(base) !== testRoot) return path.resolve(base, name)
  const logical = name.replaceAll('\\', '/')
  if (logical === 'registry.json' || logical === 'registry' || logical.startsWith('registry/')) return path.resolve(webRoot, logical)
  if (logical === 'preview' || logical.startsWith('preview/')) return path.resolve(webRoot, logical.slice('preview'.length).replace(/^\//, ''))
  if (logical === 'public' || logical.startsWith('public/') || logical === 'dist' || logical.startsWith('dist/')) return path.resolve(webRoot, logical)
  if (/^scripts\/(prepare-preview|serve)\.mjs$/.test(logical)) return path.resolve(webRoot, logical)
  if (logical === 'tests' || logical.startsWith('tests/') || logical === 'scripts' || logical.startsWith('scripts/')) return path.resolve(testRoot, logical)
  if (logical === 'playwright.config.ts' || logical === 'vite.config.ts') return path.join(testRoot, logical)
  if (logical === 'vite.preview.config.ts') return path.join(webRoot, 'vite.config.ts')
  return path.resolve(repoRoot, logical)
}

export function packageBin(name, binary, from = testRoot) {
  const require = createRequire(path.join(from, 'package.json'))
  let location
  try { location = require.resolve(`${name}/package.json`) }
  catch {
    let folder = path.dirname(require.resolve(name))
    for (;;) {
      const candidate = path.join(folder, 'package.json')
      if (fs.existsSync(candidate) && JSON.parse(fs.readFileSync(candidate, 'utf8')).name === name) { location = candidate; break }
      const parent = path.dirname(folder)
      if (parent === folder) throw Error(`Cannot locate package ${name}`)
      folder = parent
    }
  }
  const manifest = JSON.parse(fs.readFileSync(location, 'utf8'))
  const bins = typeof manifest.bin === 'string' ? {[name]: manifest.bin} : manifest.bin
  const target = bins?.[binary ?? name] ?? Object.values(bins ?? {})[0]
  if (!target) throw Error(`Package ${name} does not expose ${binary ?? name}`)
  return path.resolve(path.dirname(location), target)
}
