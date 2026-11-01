import {test} from "bun:test"
import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import {createHash} from "node:crypto"
import {splashMotion,splashTransform} from "../../../apps/web/splash-motion.ts"
const root=new URL('./reference/title-splash/',import.meta.url)
const bytes=readFileSync(new URL('oracle-104.csv',root)),provenance=JSON.parse(readFileSync(new URL('provenance.json',root),'utf8'))
const rows=bytes.toString('utf8').trim().split(/\r?\n/).filter(line=>!line.startsWith('#')).map(line=>line.split(',').map(Number))
const buffer=new DataView(new ArrayBuffer(4)),bits=value=>{buffer.setFloat32(0,value);return buffer.getInt32(0)}
test('all 1000 splash phases match the independent native single-precision and shipped JOML oracle',()=>{
 assert.equal(createHash('sha256').update(bytes).digest('hex'),provenance.expectedSha256)
 assert.equal(rows.length,1000)
 for(const[time,...expected]of rows){
  const actual=splashMotion(time,104)
  assert.deepEqual([actual.pulse,actual.scale,actual.a,actual.b,actual.c,actual.d].map(bits),expected,`Time ${time}ms`)
 }
})
test('the glyph origin uses native integer centering and the native -8 baseline',()=>{
 assert.equal(splashMotion(0,105).originX,-52)
 assert.equal(splashMotion(0,105).originY,-8)
 const frame=splashMotion(0,104)
 assert.equal(splashTransform(frame,3),`matrix(${frame.a*3},${frame.b*3},${frame.c*3},${frame.d*3},0,0)`)
 assert.deepEqual(splashMotion(1000,104),frame)
})

test('vanilla reaches maximum size twice per second, 500ms apart',()=>{
 const scales=Array.from({length:1000},(_,time)=>splashMotion(time,104).scale)
 const peaks=scales.flatMap((value,time)=>value>scales[(time+999)%1000]&&value>scales[(time+1)%1000]?[time]:[])
 assert.deepEqual(peaks,[0,500])
})
