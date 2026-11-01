import { resolveRepositoryPath, testRoot } from '../../../workspace-paths.mjs';

import { test, expect } from "./verified-test";

import { readFileSync } from "node:fs";

import { createHash } from "node:crypto";

import { minecraftToastSounds } from "../../../apps/web/registry/ui/minecraft-toast-sound-assets";

const hash=(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex")

test("Toast original sound assets and native gain match the effective asset index",()=>{
 const provenance=JSON.parse(readFileSync(resolveRepositoryPath("tests/reference/toast/sound-provenance.json", testRoot),"utf8"))
 for(const kind of ["in","out"] as const){const source=provenance.events[`ui.toast.${kind}`];expect(hash(Buffer.from(minecraftToastSounds[kind].split(",")[1],"base64"))).toBe(source.asset.sha256);expect(source.definition.sounds[0].volume).toBe(.4);expect(source.nativePitch).toBe(1);expect(source.nativeVolume).toBe(1)}
})
