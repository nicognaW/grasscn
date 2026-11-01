import {pixelPerfectTestRoot, resolveRepositoryPath} from '@ppt/paths'
import {test} from 'bun:test'
import assert from 'node:assert/strict'
import {mkdir, cp, mkdtemp, readFile, writeFile, rm} from 'node:fs/promises'
import path from 'node:path'
import {verifyPortingEvidence} from '@ppt/runtime/check-porting-evidence.mjs'

test('evidence chain rejects corrupted inputs, generated outputs and stale trace identity', async()=>{
  const scratchRoot=path.join(pixelPerfectTestRoot,'unit')
  await mkdir(scratchRoot,{recursive:true})
  const root = await mkdtemp(path.join(scratchRoot,'grasscn-evidence-'))
  const files = [
    'tests/reference/trading/scrollbar/manifest.json', 'tests/reference/trading/scrollbar/interaction-repeatability.json', 'tests/reference/trading/scrollbar/trading-scroll-events.json',
    ...['terrain-provenance.json','map-world-generation.json','generation-repeatability.json','inputs/map-world-input.json.gz','map-world.colors'].map(name=>'tests/reference/map/demo-world/'+name),
    'preview/demos/map-world-data.ts', 'tests/reference/player-preview/custom-skins/skin-provenance.json', 'tests/fixture/dream-skin.png', 'tests/fixture/steve-skin.png',
  ]
  try {
    for(const file of files) await cp(resolveRepositoryPath(file),path.join(root,file),{recursive:true})
    await verifyPortingEvidence(root)
    for(const file of ['tests/reference/map/demo-world/map-world.colors','tests/reference/map/demo-world/inputs/map-world-input.json.gz','tests/fixture/dream-skin.png']) {
      const target = path.join(root,file), original = await readFile(target), changed = Buffer.from(original); changed[0] ^= 1
      await writeFile(target,changed); await assert.rejects(()=>verifyPortingEvidence(root)); await writeFile(target,original)
    }
    for(const [file,mutate] of [
      ['tests/reference/trading/scrollbar/interaction-repeatability.json', data=>{data.captureSourceSha256='0'.repeat(64)}],
      ['tests/reference/map/demo-world/generation-repeatability.json', data=>{data.generationRunTwo.unsupportedRequests=1}],
    ]) {
      const target=path.join(root,file), original=await readFile(target), data=JSON.parse(original)
      mutate(data); await writeFile(target,JSON.stringify(data)); await assert.rejects(()=>verifyPortingEvidence(root)); await writeFile(target,original)
    }
    const target=path.join(root,'preview/demos/map-world-data.ts'),original=await readFile(target,'utf8')
    await writeFile(target,original.replace(/(worldMapPaletteBase64\s*=\s*")[A-Za-z0-9+/]/,'$1A'))
    await assert.rejects(()=>verifyPortingEvidence(root))
  } finally { await rm(root,{recursive:true,force:true}) }
})
