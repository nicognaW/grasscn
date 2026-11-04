// The ported firework rocket must ask for the sounds the native 26.2 client
// asks for at the fixed seeds, as heard by the declared listener within 10
// blocks of the explosion: the near variants, in the native order, on the
// native ticks, with the native pitch and volume floats. The expected calls
// were recorded inside native launches (the read-only SoundManager hook,
// manifest.json of the firework-sounds record), not computed here.
import { test } from "bun:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  FIREWORK_ROCKET_SPAWN,
  FireworkRocketSimulation,
} from "@grasscn/web/ui/minecraft-firework-rocket";

import {
  fireworkSoundManifestSchema,
  nativeFireworkSoundsFor,
} from "../../src/native/firework-sound-case";
import { projectedFireworkRocketManifestSchema } from "../../src/native/projected-firework-rocket-case";
import { pixelPerfectFile, repoRoot } from "../../src/paths";

const record = fireworkSoundManifestSchema.parse(
  JSON.parse(
    readFileSync(
      pixelPerfectFile("tests/reference/firework-sounds/manifest.json"),
      "utf-8"
    )
  )
);

const rocketManifest = projectedFireworkRocketManifestSchema.parse(
  JSON.parse(
    readFileSync(
      pixelPerfectFile("tests/reference/firework-rocket/manifest.json"),
      "utf-8"
    )
  )
);

const listener = (name: string) => {
  const entry = record.listeners.find((candidate) => candidate.name === name);
  assert.ok(entry !== undefined, `listener ${name}`);

  return entry;
};

const floatBits = (value: number) => {
  const view = new DataView(new ArrayBuffer(4));
  view.setFloat32(0, value);

  return view.getInt32(0);
};

const sha256 = (file: string) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");

test("the native sound record is bound to its case, rocket case and harness", () => {
  assert.equal(
    record.caseDefinitionSha256,
    sha256(pixelPerfectFile("tests/reference/firework-sounds/case.json"))
  );
  assert.equal(
    record.rocketCaseSha256,
    sha256(pixelPerfectFile("tests/reference/firework-rocket/case.json"))
  );
  assert.equal(record.sourceJar.sha256, rocketManifest.sourceJar.sha256);

  for (const { file, sha256: expected } of record.harnessSources) {
    assert.equal(sha256(path.join(repoRoot, file)), expected, file);
  }
});

test("the ported rocket plays the native near sounds on their ticks with native pitch and volume", () => {
  const simulation = new FireworkRocketSimulation(FIREWORK_ROCKET_SPAWN);
  const played = [];

  while (!simulation.done) {
    for (const sound of simulation.tick()) {
      played.push({
        pitchBits: floatBits(sound.pitch),
        sound: `minecraft:${sound.sound}`,
        source: sound.source,
        tick: simulation.ticks,
        volumeBits: floatBits(sound.volume),
      });
    }
  }

  assert.deepEqual(
    played,
    listener("near").sounds.map(
      ({ pitchBits, sound, source, tick, volumeBits }) => ({
        pitchBits,
        sound,
        source,
        tick,
        volumeBits,
      })
    )
  );
});

test("the declared listener hears every native firework sound undelayed", () => {
  assert.ok(
    listener("near").sounds.every(
      (sound) => sound.call === "play" && sound.delayTicks === 0
    )
  );
});

test("the native records differ by listener only in the vanilla variant and distance delay", () => {
  const records = [
    ...record.listeners,
    {
      camera: rocketManifest.nativeCamera,
      name: "firework-rocket (#48)",
      sounds: rocketManifest.sounds,
    },
  ];

  for (const { camera, name, sounds } of records) {
    assert.deepEqual(
      sounds.map(({ call, delayTicks, sound }) => ({
        call,
        delayTicks,
        sound,
      })),
      nativeFireworkSoundsFor(camera.position, sounds),
      name
    );
    assert.deepEqual(
      sounds.map(({ pitchBits, tick, volumeBits }) => ({
        pitchBits,
        tick,
        volumeBits,
      })),
      listener("near").sounds.map(({ pitchBits, tick, volumeBits }) => ({
        pitchBits,
        tick,
        volumeBits,
      })),
      name
    );
  }

  // Within 16 blocks but farther than 10: near variants, still delayed.
  assert.ok(
    listener("near-delayed").sounds.some(
      (sound) => !sound.sound.endsWith("_far") && sound.delayTicks > 0
    )
  );
});
