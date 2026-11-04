// Declarations shared by the native firework sound record and the checks
// that read it: the #48 firework rocket heard from listeners within 16
// blocks of the explosion, and the vanilla rules that choose each call.
import { z } from "zod";

import { nativeSoundSchema } from "./projected-firework-rocket-case";

const vector3 = z.tuple([z.number(), z.number(), z.number()]);

export const fireworkSoundCaseSchema = z.object({
  component: z.string(),
  description: z.string(),
  listeners: z
    .array(
      z.object({
        camera: z.object({
          eye: vector3,
          xRot: z.number(),
          yRot: z.number(),
        }),
        description: z.string(),
        name: z.string().regex(/^[a-z0-9-]+$/u),
      })
    )
    .min(1),
  minecraftVersion: z.literal("26.2"),
  // The rocket case whose world, projection, rocket and seeds are reused.
  rocketCase: z.string(),
});

export const fireworkSoundManifestSchema = z.object({
  caseDefinitionSha256: z.string().length(64),
  harnessSources: z.array(
    z.object({ file: z.string(), sha256: z.string().length(64) })
  ),
  listeners: z.array(
    z.object({
      camera: z.object({
        position: vector3,
        rotation: z.tuple([z.number(), z.number()]),
      }),
      lastTick: z.number().int().positive(),
      name: z.string(),
      rocketLifetime: z.number().int().positive(),
      runtime: z.record(z.string(), z.unknown()),
      seededParticles: z.number().int().positive(),
      sounds: z.array(nativeSoundSchema),
    })
  ),
  minecraftVersion: z.literal("26.2"),
  mods: z.array(z.never()),
  resourcePacks: z.array(z.never()),
  rocketCaseSha256: z.string().length(64),
  scope: z.string(),
  sourceJar: z.object({ path: z.string(), sha256: z.string().length(64) }),
});

export type FireworkSoundManifest = z.infer<typeof fireworkSoundManifestSchema>;

type NativeSound = z.infer<typeof nativeSoundSchema>;

// Vec3.distanceToSqr in Java double arithmetic.
const distanceToSqr = (
  [ax, ay, az]: readonly [number, number, number],
  [bx, by, bz]: readonly [number, number, number]
) => {
  const dx = ax - bx;
  const dy = ay - by;
  const dz = az - bz;

  return dx * dx + dy * dy + dz * dz;
};

/**
 * The call the vanilla client makes for each recorded firework sound, from
 * the camera position and the recorded sound position:
 * - FireworkRocketEntity.tick plays the launch on the server; the client
 *   plays the packet through ClientLevel.playSeededSound without a distance
 *   delay.
 * - FireworkParticles.Starter selects the _far blast and twinkle when
 *   isFarAwayFromCamera (distance² >= 256), and plays them through
 *   ClientLevel.playLocalSound with distanceDelay: farther than 10 blocks
 *   (distance² > 100), ClientLevel.playSound calls SoundManager.playDelayed
 *   with (int)(sqrt(distance²) / 40 * 20) ticks.
 */
export const nativeFireworkSoundsFor = (
  camera: readonly [number, number, number],
  sounds: readonly NativeSound[]
) =>
  sounds.map(({ position, sound }) => {
    if (sound === "minecraft:entity.firework_rocket.launch") {
      return { call: "play", delayTicks: 0, sound };
    }

    const distanceSqr = distanceToSqr(camera, position);
    const base = sound.replace(/_far$/u, "");
    const variant = distanceSqr >= 256 ? `${base}_far` : base;

    if (distanceSqr > 100) {
      return {
        call: "playDelayed",
        // Java's (int) cast.
        delayTicks: Math.trunc((Math.sqrt(distanceSqr) / 40) * 20),
        sound: variant,
      };
    }

    return { call: "play", delayTicks: 0, sound: variant };
  });
