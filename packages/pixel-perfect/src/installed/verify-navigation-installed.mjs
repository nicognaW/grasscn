import {resolveRepositoryPath} from '@ppt/paths'
import assert from "node:assert/strict"
import {readFile} from "node:fs/promises"
import {createHash} from "node:crypto"
import path from "node:path"
import {expect} from "@playwright/test"
import {PNG} from "pngjs"

const sha=bytes=>createHash("sha256").update(bytes).digest("hex")
const settle=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))

export async function verifyNavigationCase({page,c,manifestFile,url,repo}) {
  const header=["tabs","tabs-extra"].some(folder=>manifestFile===`tests/reference/${folder}/manifest.json`)
  const rows=manifestFile==="tests/reference/suggestions/manifest.json"
  const expectedBytes=await readFile(resolveRepositoryPath(path.join(path.dirname(manifestFile),"captures",c.name)))
  assert.equal(sha(expectedBytes),c.sha256)
  const expected=PNG.sync.read(expectedBytes)
  const variants=header ? c.element==="tabs" ? ["trigger","link","indicator"]:["trigger","link"]:["viewport","inline"]
  let result
  for(const variant of variants){
    let params
    if(header){
      params=new URLSearchParams({component:"navigation-menu",native:"1",part:c.element,width:String(c.width),height:String(c.height),scale:String(c.scale),state:c.state,timeMs:String(c.timeMs),x:String(c.x),y:String(c.y)})
      for(const key of ["label","selected","selectedIndex","targetIndex","disabledIndex","contentHeight"])if(c[key]!=null)params.set(key,String(c[key]))
      if(c.labels)params.set("labels",JSON.stringify(c.labels))
      if(variant==="link")params.set("links","1")
      if(variant==="indicator")params.set("indicator","1")
    }else{
      params=new URLSearchParams({component:"navigation-menu",panel:"1",mode:rows ? "rows":c.text==null ? "card":"text",label:c.label??"",text:c.text??"",width:String(c.width),height:String(c.height),scale:String(c.scale),x:String(c.x),y:String(c.y)})
      if(rows){params.set("labels",JSON.stringify(c.labels));params.set("surface",c.element==="menu-panel"?"popup":"suggestions")}
      if(variant==="inline")params.set("noViewport","1")
    }
    await page.goto(`${url}?${params}`)
    const subject=page.locator("#subject")
    if(header){
      await expect(subject).toBeVisible()
      await subject.evaluate((node,p)=>Object.assign(node.style,{position:"fixed",left:p.x+"px",top:p.y+"px",width:p.width+"px",visibility:"visible"}),{x:c.x*c.scale,y:c.y*c.scale,width:c.width*c.scale})
    }else await expect(subject).toHaveAttribute("data-mc-navigation-content-ready","true")
    await page.addStyleTag({content:`html,body{background:${c.background}}#root{visibility:hidden}#subject{visibility:visible}`})
    await page.mouse.move(0,0)
    if(header){
      if(c.element==="tabs-trigger"){
        await expect(subject).toHaveAttribute("data-mc-tab-ready","true")
        if(c.state.endsWith("hover"))await subject.hover()
        if(c.state==="focus")await subject.focus()
      }else{
        const list=subject.locator('[data-slot="navigation-menu-list"]')
        await expect(list).toHaveAttribute("data-mc-tabs-ready","true")
        const target=list.locator(variant==="link"?'[data-slot="navigation-menu-link"]':'[data-slot="navigation-menu-trigger"]').nth(c.targetIndex??0)
        if(c.state==="hover")await target.hover()
        if(c.state==="focus")await target.focus()
      }
      for(const label of await subject.locator('[data-mc-label-ready]').all())await expect(label).toHaveAttribute("data-mc-label-ready","true")
    }else if(rows){
      await expect(subject).toHaveAttribute("data-mc-menu-ready","true")
      await subject.focus()
      if(c.selectedIndex>=0)await subject.getByRole("link").nth(c.selectedIndex).focus()
      if(c.state.endsWith("hover")){await subject.focus();await subject.getByRole("link").nth(c.targetIndex).hover()}
      await subject.evaluate((node,value)=>{node.scrollTop=value},(c.value??0)*12*c.scale)
      await expect(subject.locator('[data-mc-menu-text-ready="false"]')).toHaveCount(0)
      for(const label of await subject.locator('[data-mc-menu-unicode-ready]').all())await expect(label).toHaveAttribute("data-mc-menu-unicode-ready","true")
    }else{
      await expect(subject.locator('[data-mc-popover-text-ready="false"]')).toHaveCount(0)
      for(const label of await subject.locator('[data-mc-popover-unicode-ready]').all())await expect(label).toHaveAttribute("data-mc-popover-unicode-ready","true")
    }
    await settle(page)
    const bounds=await subject.boundingBox()
    assert.deepEqual([bounds.x,bounds.y],[c.x*c.scale,c.y*c.scale])
    const actual=PNG.sync.read(await subject.screenshot())
    assert.deepEqual([actual.width,actual.height],[expected.width,expected.height])
    assert.ok(actual.data.equals(expected.data),`Installed Navigation Menu pixels differ: ${c.name} ${variant}`)
    if(!result)result={name:c.name,mismatchedPixels:0,decodedRgbaSha256:sha(actual.data)}
    else result[variant==="link" ? "linkDecodedRgbaSha256":variant==="indicator" ? "indicatorDecodedRgbaSha256":"inlineDecodedRgbaSha256"]=sha(actual.data)
  }
  return result
}
