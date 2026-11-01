import path from 'node:path'
import {pixelPerfectRoot, referenceFile as ownedReferenceFile} from '@grasscn/tests/paths'
export * from '@grasscn/tests/paths'
export function referenceFile(name:string,root=path.join(pixelPerfectRoot,'tests/reference')){
 return ownedReferenceFile(name,root)
}
