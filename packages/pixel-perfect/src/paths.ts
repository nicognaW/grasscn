import path from 'node:path'
import {pixelPerfectRoot} from '@grasscn/tests/paths'
export * from '@grasscn/tests/paths'
export function referenceFile(name:string,root=path.join(pixelPerfectRoot,'tests/reference')){
 if(typeof name!=='string'||path.isAbsolute(name))throw Error('Expected an owner-relative reference name')
 const target=path.resolve(root,name),relative=path.relative(path.resolve(root),target)
 if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('Reference escapes its explicit owner')
 return target
}
