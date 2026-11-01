import {test} from "node:test"
import assert from "node:assert/strict"
import path from "node:path"
import {installedRegistryFile} from "../scripts/installed-registry-file.mjs"
const consumer=path.resolve("consumer")
const settings={aliases:{ui:"@/components/ui",components:"@/components",hooks:"@/hooks",lib:"@/lib"}}
test("installed recipes use the configured components directory and primitives use ui",()=>{
  assert.equal(installedRegistryFile({path:"registry/blocks/data-table.tsx",target:"@components/data-table.tsx"},consumer,settings),path.join(consumer,"src/components/data-table.tsx"))
  assert.equal(installedRegistryFile({path:"registry/ui/table.tsx",type:"registry:ui"},consumer,settings),path.join(consumer,"src/components/ui/table.tsx"))
  assert.equal(installedRegistryFile({path:"registry/hooks/use-mobile.ts",type:"registry:hook"},consumer,settings),path.join(consumer,"src/hooks/use-mobile.ts"))
})
test("nested consumer roots and custom component aliases remain independent",()=>{
  const custom={aliases:{...settings.aliases,components:"@/features"}}
  assert.equal(installedRegistryFile({target:"@components/form.tsx"},consumer,custom,"web/src/components/ui"),path.join(consumer,"web/src/features/form.tsx"))
  assert.throws(()=>installedRegistryFile({target:"../../outside.ts"},consumer,settings),/inside the consumer/)
})
