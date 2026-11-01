import {test} from 'bun:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {PNG} from 'pngjs'
import {installedCaseCache,installedConsumerIdentity} from '../scripts/installed-case-cache.mjs'
const digest=bytes=>createHash('sha256').update(bytes).digest('hex')

test('installed case checkpoints require all aliases, exact pixels and matching source identity',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'grasscn-case-cache-'))
 try{
  const png=new PNG({width:2,height:2});png.data.fill(255)
  const bytes=PNG.sync.write(png),rgba=digest(png.data)
  const record={name:'case',mismatchedPixels:0,decodedRgbaSha256:rgba,selectedDecodedRgbaSha256:rgba}
  const identity={source:'one',browser:'edge'},cache=installedCaseCache(directory,identity)
  cache.write('case',bytes,record,{decodedRgbaSha256:bytes,selectedDecodedRgbaSha256:bytes})
  assert.deepEqual(cache.read('case',bytes,Object.keys(record).filter(k=>k.endsWith('Sha256'))),record)
  assert.equal(cache.read('case',bytes,['decodedRgbaSha256']),null)
  assert.equal(installedCaseCache(directory,{...identity,source:'two'}).read('case',bytes,['decodedRgbaSha256','selectedDecodedRgbaSha256']),null)
  png.data[0]^=1;const changed=PNG.sync.write(png)
  assert.equal(cache.read('case',changed,['decodedRgbaSha256','selectedDecodedRgbaSha256']),null)
  assert.throws(()=>cache.write('case',bytes,record,{decodedRgbaSha256:changed}))
  const folder=path.join(directory,fs.readdirSync(directory)[0],digest('case'))
  fs.writeFileSync(path.join(folder,digest('decodedRgbaSha256')+'.png'),changed)
  assert.equal(cache.read('case',bytes,['decodedRgbaSha256','selectedDecodedRgbaSha256']),null)
 }finally{assert.ok(directory.startsWith(path.join(os.tmpdir(),'grasscn-case-cache-')));fs.rmSync(directory,{recursive:true,force:true})}
})

test('consumer identity changes with fixture and installed dependency inputs',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'grasscn-case-cache-'))
 try{
  fs.mkdirSync(path.join(directory,'src'));fs.writeFileSync(path.join(directory,'src','fixture.tsx'),'first')
  const before=installedConsumerIdentity(directory)
  fs.writeFileSync(path.join(directory,'src','fixture.tsx'),'second')
  const after=installedConsumerIdentity(directory);assert.notEqual(before,after)
  fs.writeFileSync(path.join(directory,'bun.lock'),'changed dependency')
  const dependency=installedConsumerIdentity(directory);assert.notEqual(after,dependency)
  fs.writeFileSync(path.join(directory,'dynamic.html'),'<style>body{background:red}</style>')
  const entrypoint=installedConsumerIdentity(directory);assert.notEqual(dependency,entrypoint)
  fs.mkdirSync(path.join(directory,'public'));fs.writeFileSync(path.join(directory,'public','sprite.png'),'new asset')
  assert.notEqual(entrypoint,installedConsumerIdentity(directory))
 }finally{assert.ok(directory.startsWith(path.join(os.tmpdir(),'grasscn-case-cache-')));fs.rmSync(directory,{recursive:true,force:true})}
})
