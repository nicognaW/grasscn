import {repoRoot, resolveRepositoryPath} from '@ppt/paths'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {gunzipSync} from 'node:zlib'

export async function verifyPortingEvidence(root) {
  const bytes = name => readFile(resolveRepositoryPath(name, root))
  const json = async name => JSON.parse(await bytes(name))
  const digest = data => createHash('sha256').update(data).digest('hex')
  const trading = 'tests/reference/trading/scrollbar/'
  const manifest = await json(trading + 'manifest.json')
  const repeat = await json(trading + 'interaction-repeatability.json')
  for (const key of ['sourceJarSha256', 'captureSourceSha256', 'caseDefinitionSha256'])
    assert.equal(repeat[key], manifest[key], `Trading trace identity: ${key}`)
  assert.equal(repeat.identical, true, 'Trading native trace repeat must pass')
  const events = await json(trading + 'trading-scroll-events.json')
  assert.deepEqual(Object.keys(events).map(Number).sort((a,b)=>a-b), repeat.offerCounts)
  assert.equal(Object.values(events).reduce((n, cases) => n + cases.length, 0), repeat.count)
  for (const [count, cases] of Object.entries(events)) {
    assert.ok(cases.length > 0)
    for (const sample of cases) {
      assert.ok(['wheel', 'press', 'drag'].includes(sample.kind))
      assert.ok(Number.isInteger(sample.result) && sample.result >= 0 && sample.result <= Math.max(0, Number(count)-7))
    }
  }

  const map = 'tests/reference/map/demo-world/'
  const provenance = await json(map + 'terrain-provenance.json')
  const generation = await json(map + 'map-world-generation.json')
  const repeated = await json(map + 'generation-repeatability.json')
  const inputBytes = await bytes(map + 'inputs/map-world-input.json.gz')
  assert.equal(digest(inputBytes), provenance.inputSha256, 'Frozen terrain input hash')
  assert.equal(inputBytes.length, provenance.inputBytes)
  const input = JSON.parse(gunzipSync(inputBytes))
  assert.equal(input.chunks.length, provenance.chunks)
  assert.equal(input.sourceRegionSha256, provenance.sourceRegionSha256)
  assert.equal(provenance.originalRegionUnchanged, true)
  assert.equal(provenance.sourceRegionAfterGenerationSha256, provenance.sourceRegionSha256)
  assert.deepEqual(repeated.generationRunOne, generation)
  assert.deepEqual(repeated.generationRunTwo, generation)
  assert.equal(generation.inputSha256, provenance.inputSha256)
  assert.equal(generation.sourceRegionSha256, provenance.sourceRegionSha256)
  assert.equal(generation.unsupportedRequests, 0)
  assert.equal(generation.unexploredPixels, 0)
  assert.deepEqual([generation.centerX, generation.centerZ], provenance.center)
  assert.equal(generation.mapScale, provenance.mapScale)
  const palette = await bytes(map + 'map-world.colors')
  assert.equal(palette.length, 16384)
  assert.equal(repeated.colorsBytes, palette.length)
  assert.equal(repeated.mismatchedPaletteBytes, 0)
  for (const hash of [generation.colorsSha256, repeated.colorsSha256, provenance.previewPaletteSha256])
    assert.equal(digest(palette), hash, 'Generated map palette hash')
  const demo = (await bytes('preview/demos/map-world-data.ts')).toString('utf8')
  const embedded = demo.match(/export const worldMapPaletteBase64\s*=\s*"([A-Za-z0-9+/=]+)"/)
  assert.ok(embedded, 'Map demo must embed the verified native palette')
  assert.deepEqual(Buffer.from(embedded[1], 'base64'), palette, 'Demo palette differs from native generation')
  const skins = await json('tests/reference/player-preview/custom-skins/skin-provenance.json')
  for (const [name, record] of Object.entries(skins)) {
    if (!record.sha256) continue
    assert.equal(digest(await bytes(`tests/fixture/${name}-skin.png`)), record.sha256, `Frozen ${name} skin`)
  }
  return {nativeTraceEvents: repeat.count, mapPaletteBytes: palette.length, scope: 'Committed evidence integrity; no fresh native launch'}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(await verifyPortingEvidence(path.resolve(repoRoot)))
}
