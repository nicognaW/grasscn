import path from 'node:path'
import {repoRoot,webRoot,testRoot,fixtureRoot,referenceRoot} from '../../../workspace-paths.mjs'
export {repoRoot,webRoot,testRoot,fixtureRoot,referenceRoot,pixelPerfectRoot,pixelPerfectTestRoot,packageBin,resolveRepositoryPath} from '../../../workspace-paths.mjs'

function ownedFile(root:string,name:string){
 if(typeof name!=='string'||path.isAbsolute(name))throw Error('Expected an owner-relative file name')
 const target=path.resolve(root,name),relative=path.relative(path.resolve(root),target)
 if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('File escapes its explicit owner')
 return target
}
export const fixtureFile=(name:string,root=fixtureRoot)=>ownedFile(root,name)
export const referenceFile=(name:string,root=referenceRoot)=>ownedFile(root,name)
export const registryFile=(name:string,root=path.join(webRoot,'registry'))=>ownedFile(root,name)
export const testFile=(name:string,root=path.join(testRoot,'tests'))=>ownedFile(root,name)
