import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { test, expect } from "@grasscn/tests/test";
import { minecraftToastSounds } from "@grasscn/web/ui/minecraft-toast-sound-assets";
import { referenceFile } from "@tests/paths";

const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

test("Toast original sound assets and native gain match the effective asset index", () => {
  const provenance = JSON.parse(
    readFileSync(referenceFile("toast/sound-provenance.json"), "utf-8")
  );

  for (const kind of ["in", "out"] as const) {
    const source = provenance.events[`ui.toast.${kind}`];
    expect(
      hash(Buffer.from(minecraftToastSounds[kind].split(",")[1], "base64"))
    ).toBe(source.asset.sha256);
    expect(source.definition.sounds[0].volume).toBe(0.4);
    expect(source.nativePitch).toBe(1);
    expect(source.nativeVolume).toBe(1);
  }
});
