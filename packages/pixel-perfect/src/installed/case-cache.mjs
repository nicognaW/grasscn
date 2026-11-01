import {installedDependencyIdentity} from '@grasscn/tests/dependency-identity'
import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import assert from 'node:assert/strict'
import {PNG} from 'pngjs'

const digest=bytes=>createHash('sha256').update(bytes).digest('hex')

export function installedConsumerIdentity(consumer){
 const hash=createHash('sha256')
 function visit(relative){
  const target=path.join(consumer,relative)
  if(!fs.existsSync(target)){hash.update(relative+'\0<missing>\0');return}
  if(fs.statSync(target).isDirectory()){
   for(const name of fs.readdirSync(target).sort())visit(path.join(relative,name))
  }else hash.update(relative).update('\0').update(digest(fs.readFileSync(target))).update('\0')
 }
 for(const entry of ['src','public','package.json','bun.lock','components.json'])visit(entry)
 for(const entry of fs.readdirSync(consumer).sort()){
  if(/\.html$|^vite\.config\.|^tsconfig.*\.json$|^\.env(?:\.|$)/.test(entry))visit(entry)
 }
 hash.update(JSON.stringify(installedDependencyIdentity(consumer)))
 return hash.digest('hex')
}

// Callers bind identity to sources, fixture/dependencies, browser and reference manifest.
// Only completed cases with intact PNGs identical to the current reference are reusable.
export function installedCaseCache(directory,identity){
 const key=digest(JSON.stringify({schema:1,helper:digest(fs.readFileSync(fileURLToPath(import.meta.url))),identity}))
 const root=path.join(directory,key)
 const caseRoot=name=>path.join(root,digest(name))
 function matches(bytes,reference){
  const actual=PNG.sync.read(bytes),expected=PNG.sync.read(reference)
  return actual.width===expected.width&&actual.height===expected.height&&actual.data.equals(expected.data)
 }
 function atomic(file,bytes){const temporary=file+'.tmp';fs.writeFileSync(temporary,bytes);fs.renameSync(temporary,file)}
 return {
  read(name,reference,fields){
   try{
    const folder=caseRoot(name),entry=JSON.parse(fs.readFileSync(path.join(folder,'case.json'),'utf8'))
    if(entry.name!==name||entry.reference!==digest(reference)||entry.record?.name!==name||entry.record.mismatchedPixels!==0)return null
    if(JSON.stringify(Object.keys(entry.images).sort())!==JSON.stringify([...fields].sort()))return null
    const rgba=digest(PNG.sync.read(reference).data)
    for(const field of fields){
     const bytes=fs.readFileSync(path.join(folder,digest(field)+'.png'))
     if(digest(bytes)!==entry.images[field]||entry.record[field]!==rgba||!matches(bytes,reference))return null
    }
    return entry.record
   }catch{return null}
  },
  write(name,reference,record,images){
   assert.equal(record.name,name);assert.equal(record.mismatchedPixels,0)
   const rgba=digest(PNG.sync.read(reference).data),hashes={}
   for(const[field,bytes]of Object.entries(images)){
    assert.equal(record[field],rgba);assert.ok(matches(bytes,reference),'Cannot cache a pixel mismatch')
    hashes[field]=digest(bytes)
   }
   assert.ok(Object.keys(hashes).length)
   const folder=caseRoot(name);fs.mkdirSync(folder,{recursive:true})
   for(const[field,bytes]of Object.entries(images))atomic(path.join(folder,digest(field)+'.png'),bytes)
   atomic(path.join(folder,'case.json'),JSON.stringify({name,reference:digest(reference),record,images:hashes}))
  }
 }
}
