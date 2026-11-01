import { resolveRepositoryPath, pixelPerfectRoot } from '@ppt/paths';

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";

import { readFileSync, writeFileSync } from "node:fs";

import path from "node:path";

import { PNG } from "pngjs";

import { createHash } from "node:crypto";

const repo=path.resolve('.');

function compare(actual:PNG,expected:PNG,info:any,c:any,part:string){let mismatchedPixels=0;const diff=new PNG({width:actual.width,height:actual.height});for(let i=0;i<actual.data.length;i+=4){const changed=!actual.data.subarray(i,i+4).equals(expected.data.subarray(i,i+4));if(changed)mismatchedPixels++;diff.data.set(changed?[255,0,255,255]:[0,0,0,255],i)}writeFileSync(info.outputPath('diff.png'),PNG.sync.write(diff));writeFileSync(info.outputPath('metrics.json'),JSON.stringify({case:c.name,part,mismatchedPixels,width:actual.width,height:actual.height}));expect(mismatchedPixels).toBe(0)}

const runtimeErrors=new WeakMap<object,string[]>()

test.beforeEach(({page})=>{const errors:string[]=[];runtimeErrors.set(page,errors);page.on("pageerror",error=>errors.push(error.message))})

test.afterEach(async({page,browser},info)=>{writeFileSync(info.outputPath("runtime.json"),JSON.stringify({pageErrors:runtimeErrors.get(page)??[],browser:browser.version()}));expect(runtimeErrors.get(page)).toEqual([])})

const manifest=JSON.parse(readFileSync(resolveRepositoryPath(path.join(repo,'tests/reference/pagination-arrow/manifest.json'), pixelPerfectRoot),'utf8'));

for(const c of manifest.cases)test(`Carousel original native recipe arrow:${c.name}`,async({page},info)=>{const q=new URLSearchParams({native:'1',direction:c.checked?"forward":"backward",state:c.state,scale:String(c.scale),x:String(c.x),y:String(c.y),background:c.background});await page.goto(`/?component=carousel&${q}`);const subject=page.locator('[data-subject]');if(c.state.includes('hover'))await subject.hover();else if(c.state==='focus')await subject.focus();const bytes=readFileSync(resolveRepositoryPath(path.join(repo,'tests/reference/pagination-arrow/captures',c.name), pixelPerfectRoot));expect(createHash('sha256').update(bytes).digest('hex')).toBe(c.sha256);const actualBytes=await subject.screenshot(),actual=PNG.sync.read(actualBytes),expected=PNG.sync.read(bytes);expect([actual.width,actual.height]).toEqual([expected.width,expected.height]);writeFileSync(info.outputPath('actual.png'),actualBytes);compare(actual,expected,info,c,'arrow')})
