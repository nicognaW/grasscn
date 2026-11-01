import {repoRoot,testRoot,fixtureRoot,fixtureFile,resolveRepositoryPath} from '@tests/paths'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import {pipeline} from 'node:stream'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import assert from 'node:assert/strict'

const root=repoRoot
export const fixtureDirectory=resolveRepositoryPath(path.join('.pixel-perfect-test','production-fixture','dist'))
const fallbackDirectory=fixtureRoot
const skins=['dream-skin.png','steve-skin.png']
const digest=bytes=>createHash('sha256').update(bytes).digest('hex')
const types={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2'}

export function fixtureManifest(directory=fixtureDirectory,fallback=fallbackDirectory){
 const files=[]
 function visit(folder){
  for(const name of fs.readdirSync(folder).sort()){
   const file=path.join(folder,name),info=fs.lstatSync(file)
   assert.ok(!info.isSymbolicLink(),'Fixture bundles must not contain symlinks')
   if(info.isDirectory())visit(file)
   else files.push({path:path.relative(directory,file).split(path.sep).join('/'),sha256:digest(fs.readFileSync(file))})
  }
 }
 visit(directory)
 const fallbackFiles=skins.map(name=>({name,sha256:digest(fs.readFileSync(path.join(fallback,name)))}))
 return {directory,files,fallbackFiles,sha256:digest(JSON.stringify({files,fallbackFiles}))}
}

export async function buildProductionFixture(){
 // Vite empties this output directory. Check its resolved target before allowing that.
 const intended=resolveRepositoryPath(path.join('.pixel-perfect-test'))+path.sep
 assert.ok(path.resolve(fixtureDirectory).startsWith(intended))
 if(fs.existsSync(fixtureDirectory))assert.ok(fs.realpathSync(fixtureDirectory).startsWith(fs.realpathSync(root)+path.sep))
 const {build}=await import('vite')
 await build({configFile:path.join(testRoot,'vite.config.ts'),cacheDir:resolveRepositoryPath(path.join('.pixel-perfect-test','production-fixture','cache')),build:{outDir:fixtureDirectory,emptyOutDir:true,rollupOptions:{input:{index:fixtureFile('index.html'),adventure:fixtureFile('adventure.html')}}}})
 return fixtureManifest()
}

export async function serveProductionFixture({directory=fixtureDirectory,fallback=fallbackDirectory,port=5178}={}){
 const server=http.createServer((request,response)=>{
  try{
   const name=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname).replace(/^\/+/, '')||'index.html'
   let file=path.resolve(directory,name)
   if(!file.startsWith(path.resolve(directory)+path.sep))throw Error('Outside fixture directory')
   if(skins.includes(name)&&!fs.existsSync(file))file=path.join(fallback,name)
   if(!fs.statSync(file).isFile())throw Error('Not a file')
   response.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream')
   response.setHeader('Cache-Control',path.extname(file)==='.html'?'no-store':'public,max-age=3600')
   pipeline(fs.createReadStream(file),response,()=>{})
  }catch{response.statusCode=404;response.end('Not found')}
 })
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)})
 return {server,url:`http://127.0.0.1:${server.address().port}`,close:async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}}
}
