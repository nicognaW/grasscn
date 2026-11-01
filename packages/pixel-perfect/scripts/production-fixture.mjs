import {buildProductionFixture} from '@grasscn/tests/fixture'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
export * from '@grasscn/tests/fixture'
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildProductionFixture()
