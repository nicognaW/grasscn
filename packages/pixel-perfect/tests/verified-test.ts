import {test as base} from '@playwright/test'
import {readFileSync,readdirSync,existsSync} from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {PNG} from 'pngjs'
export * from '@playwright/test'
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex')
export const test=base.extend<{grasscnVerificationArtifacts:void}>({
 grasscnVerificationArtifacts:[async({page},use,info)=>{
  await use()
  const files=existsSync(info.outputDir)?readdirSync(info.outputDir):[]
  const artifacts=files.filter(file=>/actual.*\.png$/i.test(file)).map(file=>{
   const bytes=readFileSync(path.join(info.outputDir,file)),png=PNG.sync.read(bytes)
   return {file,width:png.width,height:png.height,pngSha256:digest(bytes),decodedRgbaSha256:digest(png.data)}
  })
  const metrics=files.filter(file=>/\.json$/i.test(file)).map(file=>{
   try{return {file,data:JSON.parse(readFileSync(path.join(info.outputDir,file),'utf8'))}}catch{return {file,unreadable:true}}
  })
  let renderedUrl:string|undefined,subjectSlot:string|null|undefined,subjectElement:string|undefined
  if(!page.isClosed()){
   renderedUrl=page.url()
   const subject=page.locator('[data-subject]')
   if(await subject.count()===1){subjectSlot=await subject.getAttribute('data-slot');subjectElement=await subject.evaluate(element=>element.tagName)}
  }
  await info.attach('grasscn-verification-artifacts',{body:Buffer.from(JSON.stringify({testId:info.testId,titlePath:info.titlePath,outputDirectory:info.outputDir,fixtureUrl:process.env.GRASSCN_FIXTURE_URL,previewUrl:process.env.GRASSCN_PREVIEW_URL,bundleSha256:process.env.GRASSCN_INSTALLED_BUNDLE_SHA256,renderedUrl,subjectSlot,subjectElement,artifacts,metrics})),contentType:'application/json'})
 },{auto:true}],
})

// Pixel Perfect Tests share the artifact fixture and retain stable case identities.
export const pixelPerfectTest = test
