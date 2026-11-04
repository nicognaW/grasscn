// The ported firework rocket must agree with the native 26.2 capture at the
// fixed seeds: the rocket lifetime the server rocket drew, and the sequence
// ticks of launch, explosion and the last spark. The expected values were
// recorded inside the native capture launches (manifest.json of the
// firework-rocket corpus), not computed here.
import { test } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  FIREWORK_ROCKET_DRAWN_BOUNDS,
  FIREWORK_ROCKET_SPAWN,
  FireworkRocketSimulation,
} from "@grasscn/web/ui/minecraft-firework-rocket";

import { projectedFireworkRocketManifestSchema } from "../../src/native/projected-firework-rocket-case";
import { pixelPerfectFile } from "../../src/paths";

const manifest = projectedFireworkRocketManifestSchema.parse(
  JSON.parse(
    readFileSync(
      pixelPerfectFile("tests/reference/firework-rocket/manifest.json"),
      "utf-8"
    )
  )
);

test("the ported rocket draws the native rocket lifetime at the fixed seed", () => {
  const simulation = new FireworkRocketSimulation(FIREWORK_ROCKET_SPAWN);

  assert.equal(simulation.lifetime, manifest.rocketLifetime);
});

test("the ported rocket launches, explodes and ends on the native sequence ticks", () => {
  const simulation = new FireworkRocketSimulation(FIREWORK_ROCKET_SPAWN);
  const { explosion, lastSpark, launch } = manifest.sequenceTicks;

  for (let tick = 1; tick < lastSpark; tick += 1) {
    simulation.tick();
    assert.equal(simulation.done, false, `still running at tick ${tick}`);
  }

  simulation.tick();
  assert.equal(simulation.done, true, `done at tick ${lastSpark}`);
  assert.deepEqual(simulation.events, { explosion, launch });
});

test("the drawn bounds are the union of every native frame's covered bounds", () => {
  const union = {
    bottom: -Infinity,
    left: Infinity,
    right: -Infinity,
    top: Infinity,
  };

  for (const { bounds } of manifest.frames) {
    union.bottom = Math.max(union.bottom, bounds.y + bounds.height);
    union.left = Math.min(union.left, bounds.x);
    union.right = Math.max(union.right, bounds.x + bounds.width);
    union.top = Math.min(union.top, bounds.y);
  }

  assert.deepEqual(union, { ...FIREWORK_ROCKET_DRAWN_BOUNDS });
});
