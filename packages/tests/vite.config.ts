import path from 'node:path'
import {defineConfig} from 'vite'
import tailwindcss from '@tailwindcss/vite'
import {fixtureRoot,testRoot,pixelPerfectTestRoot,webRoot} from '@grasscn/tests/paths'

export default defineConfig({
 root:fixtureRoot,
 cacheDir:path.join(pixelPerfectTestRoot,'vite/registry-fixture'),
 plugins:[tailwindcss()],
 resolve:{alias:{'@/lib/utils':path.join(fixtureRoot,'utils.ts'),'@/components/ui':path.join(webRoot,'registry/ui'),'@tests':path.join(testRoot,'src')}},
 server:{host:'127.0.0.1',port:5174,strictPort:true},
})
