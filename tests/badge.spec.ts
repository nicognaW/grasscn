import{test,expect}from"./verified-test"
import{readFileSync,writeFileSync}from"node:fs"
import{createHash}from"node:crypto"
import{PNG}from"pngjs"
import{minecraftBadgeAssets}from"../registry/ui/minecraft-badge-assets"
import{compare}from"./text-components-test-utils"
test.describe.configure({mode:"parallel"})
const directory="tests/reference/badge-advancement",manifest=JSON.parse(readFileSync(`${directory}/manifest.json`,"utf8"))
test("Badge advancement comparator detects one changed pixel",()=>{const a=PNG.sync.read(readFileSync(`${directory}/captures/${manifest.cases[0].name}`)),b=PNG.sync.read(PNG.sync.write(a));b.data[0]^=1;expect(compare(a,b).mismatchedPixels).toBe(1)})
for(const c of manifest.cases)test(`Badge original advancement artwork/item/title ${c.name}`,async({page},info)=>{
 await page.setViewportSize({width:1536,height:900});await page.goto(`/?${new URLSearchParams({component:"badge-advancement",achievement:c.state,earned:String(c.checked),scale:String(c.scale),label:c.label})}`)
 const subject=page.locator("[data-subject]");await expect(subject).toHaveAttribute("data-slot","badge");await page.mouse.move(0,0)
 const bytes=readFileSync(`${directory}/captures/${c.name}`);expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256)
 const actual=await subject.screenshot(),result=compare(PNG.sync.read(bytes),PNG.sync.read(actual));writeFileSync(info.outputPath("actual.png"),actual);writeFileSync(info.outputPath("diff.png"),PNG.sync.write(result.diff));writeFileSync(info.outputPath("metrics.json"),JSON.stringify({component:"badge",case:c.name,manifest:`${directory}/manifest.json`,scope:"Original AdvancementWidget hover appearance at native117x26; default compact web geometry separately tested",mismatchedPixels:result.mismatchedPixels}));expect(result.mismatchedPixels).toBe(0)
})

test("Badge embeds unchanged original advancement frames/panels and diamond artwork",()=>{const provenance=JSON.parse(readFileSync(`${directory}/asset-provenance.json`,"utf8"));for(const record of provenance){const bytes=Buffer.from(minecraftBadgeAssets[record.key as keyof typeof minecraftBadgeAssets].split(",")[1],"base64");expect(createHash("sha256").update(bytes).digest("hex")).toBe(record.sha256)}})
