import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { PNG } from "pngjs";
import { pixelPerfectTest as test, expect } from "./verified-test";

const origin=(process.env.GRASSCN_PREVIEW_URL??"http://127.0.0.1:5176").replace(/\/$/,"");

test("default header grass at intrinsic SVG size matches original Minecraft GUI3",async({page},info)=>{
  await page.setViewportSize({width:1536,height:900});
  await page.goto(`${origin}/docs`);
  const header=page.getByRole("banner");
  const logo=header.getByRole("link",{name:"grasscn home",exact:true}).locator("img");
  await logo.evaluate(element=>(element as HTMLImageElement).decode());
  const bounds=(await logo.boundingBox())!;
  expect([bounds.width,bounds.height]).toEqual([176,64]);
  expect([bounds.x,bounds.y].every(Number.isInteger)).toBe(true);
  await expect(header).toHaveCSS("background-color","rgb(32, 32, 32)");
  await expect(logo).toHaveCSS("image-rendering","pixelated");
  expect(await page.evaluate(()=>devicePixelRatio)).toBe(1);
  const manifest=JSON.parse(await readFile(new URL("./reference/branding-header/manifest.json",import.meta.url),"utf8"));
  expect(manifest.repeatDecodedRgbaEqual).toBe(true);
  const reference=manifest.cases[0];
  expect({scale:reference.scale,background:reference.background,width:reference.width,height:reference.height}).toEqual({scale:3,background:"#202020",width:48,height:48});
  const bytes=await readFile(new URL(`./reference/branding-header/${reference.path}`,import.meta.url));
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(reference.sha256);
  await page.mouse.move(0,0);
  // Crop the unchanged SVG's actual grass bounds. The source image is48x48 at
  // (0,8) in its intrinsic176x64 viewport; no DOM/style/content rewriting.
  const actualBytes=await page.screenshot({clip:{x:bounds.x,y:bounds.y+8,width:48,height:48}});
  const actual=PNG.sync.read(actualBytes),expected=PNG.sync.read(bytes);
  expect([actual.width,actual.height]).toEqual([expected.width,expected.height]);
  const compare=(left:PNG,right:PNG)=>{
    let count=0;const diff=new PNG({width:left.width,height:left.height});
    for(let offset=0;offset<left.data.length;offset+=4)if(!left.data.subarray(offset,offset+4).equals(right.data.subarray(offset,offset+4))){count++;diff.data.set([255,0,255,255],offset);}
    return{count,diff};
  };
  const mutation=PNG.sync.read(PNG.sync.write(expected));mutation.data[0]^=1;
  expect(compare(mutation,expected).count).toBe(1);
  const result=compare(actual,expected);
  await writeFile(info.outputPath("header-grass-actual.png"),actualBytes);
  await writeFile(info.outputPath("header-grass-diff.png"),PNG.sync.write(result.diff));
  await writeFile(info.outputPath("header-grass-metrics.json"),JSON.stringify({reference:reference.path,referenceSha256:reference.sha256,sourceJarSha256:manifest.sourceJarSha256,caseDefinitionSha256:manifest.caseDefinitionSha256,mismatchedPixels:result.count,totalPixels:48*48,mutationRejected:true,bounds,background:"#202020",route:page.url(),scope:manifest.scope},null,2));
  await header.screenshot({path:info.outputPath("actual-header-composition.png")});
  expect(result.count).toBe(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
