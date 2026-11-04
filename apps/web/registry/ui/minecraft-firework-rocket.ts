// Minecraft Java Edition 26.2 firework rocket flight, ported from
// net.minecraft.world.entity.projectile.FireworkRocketEntity (server and
// client sides), Entity.move in open air, ServerEntity.sendChanges with
// VecDeltaCodec and LpVec3 (the spawn, position and motion packets the
// client applies), and the client's handling of the explosion event, which
// hands over to the firework particle port.
//
// The sequence runs as the projected reference captures it: one server tick,
// then the client handles every packet of that tick, then one client tick.
// Tick N is the state after N server and N client ticks since the spawn.
//
// Java double arithmetic maps to JS numbers.
//
// oxlint-disable max-classes-per-file -- One class per vanilla side (server rocket, its ServerEntity tracker, the whole sequence) keeps the port comparable with the Java classes.
import {
  FIREWORK_SEED,
  FireworkParticleEngine,
  STAR_FIREWORK,
  createFireworkTarget,
  drawFireworkQuads,
  fogComponent,
  projectVertex,
  rasterizeTriangle,
  unorm8,
  unorm8ToFloat,
} from "./minecraft-firework-explosion";
import type {
  FireworkExplosionDefinition,
  FireworkScene,
  FireworkSound,
  FireworkSprites,
  FireworkTarget,
} from "./minecraft-firework-explosion";
import type { PngRgba } from "./minecraft-png";
import { LegacyRandomSource } from "./minecraft-random-source";

export type { FireworkSound } from "./minecraft-firework-explosion";

type Vec3 = readonly [number, number, number];

// One fixed seed per random stream for every launch (declared web
// adaptation): the n-th entity created on a side draws
// RandomSource.create(seeds.nextLong()) in Entity.<init>, and so does the
// n-th particle.
export const FIREWORK_ROCKET_SEEDS = {
  clientEntity: 42n,
  particle: FIREWORK_SEED,
  serverEntity: 42n,
} as const;

// Entity.<init>: the entity's own random source, which immediately draws its
// UUID (Mth.createInsecureUUID: two longs).
const entityRandom = (seed: bigint) => {
  const random = new LegacyRandomSource(
    new LegacyRandomSource(seed).nextLong()
  );

  random.nextLong();
  random.nextLong();

  return random;
};

// VecDeltaCodec: positions travel as 1/4096-block steps from a base.
const encode = (value: number) => Math.round(value * 4096);
const decode = (value: number) => value / 4096;
const SHORT_MAX = 32_767;

// The smallest squared position change ServerEntity sends (a float literal).
const POSITION_EPSILON = Math.fround(7.6293945e-6);

// LpVec3: a motion vector as three 15-bit fractions of a shared scale.
const LP_MIN = 3.051944088384301e-5;
const LP_STEPS = 32_766;

const lpPack = (value: number) => Math.round((value * 0.5 + 0.5) * LP_STEPS);

const lpUnpack = (value: number) =>
  (Math.min(value, LP_STEPS) * 2) / LP_STEPS - 1;

// LpVec3.write then LpVec3.read.
const lowPrecision = (value: Vec3): Vec3 => {
  const largest = Math.max(...value.map((component) => Math.abs(component)));

  if (largest < LP_MIN) {
    return [0, 0, 0];
  }

  const scale = Math.ceil(largest);

  return [
    lpUnpack(lpPack(value[0] / scale)) * scale,
    lpUnpack(lpPack(value[1] / scale)) * scale,
    lpUnpack(lpPack(value[2] / scale)) * scale,
  ];
};

/** FireworkRocketEntity in open air, not attached and not shot at an angle. */
class Rocket {
  x: number;
  y: number;
  z: number;
  xOld: number;
  yOld: number;
  zOld: number;
  motion: Vec3;
  life = 0;
  removed = false;

  constructor(position: Vec3, motion: Vec3) {
    [this.x, this.y, this.z] = position;
    [this.xOld, this.yOld, this.zOld] = position;
    this.motion = motion;
  }

  get position(): Vec3 {
    return [this.x, this.y, this.z];
  }

  // Level.tickNonPassenger, then the movement of FireworkRocketEntity.tick.
  tick() {
    this.xOld = this.x;
    this.yOld = this.y;
    this.zOld = this.z;
    // No horizontal collision: multiply(1.15, 1, 1.15).add(0, 0.04, 0).
    const [dx, dy, dz] = this.motion;
    this.motion = [dx * 1.15 + 0, dy * 1 + 0.04, dz * 1.15 + 0];
    // Entity.move: nothing collides, so the position adds the movement.
    this.x += this.motion[0];
    this.y += this.motion[1];
    this.z += this.motion[2];
    this.life += 1;
  }
}

interface SyncPackets {
  motion?: Vec3;
  // ClientboundEntityPositionSyncPacket: the exact position.
  position?: Vec3;
  // ClientboundMoveEntityPacket: VecDeltaCodec steps from the base.
  steps?: Vec3;
}

/** ServerEntity for the rocket: update interval 10, deltas tracked. */
class RocketTracking {
  #tickCount = 0;
  #base: Vec3;
  #lastSentMovement: Vec3;

  constructor(rocket: Rocket) {
    this.#base = rocket.position;
    this.#lastSentMovement = rocket.motion;
  }

  // The spawn packet: the position base and the last sent movement.
  spawn() {
    return {
      motion: lowPrecision(this.#lastSentMovement),
      position: this.#base,
    };
  }

  sendChanges(rocket: Rocket): SyncPackets {
    const packets: SyncPackets = {};

    if (this.#tickCount % 10 === 0) {
      const current = rocket.position;

      const delta = current.map(
        (value, axis) => value - (this.#base[axis] ?? 0)
      );

      const changed =
        (delta[0] ?? 0) ** 2 + (delta[1] ?? 0) ** 2 + (delta[2] ?? 0) ** 2 >=
        POSITION_EPSILON;

      const steps = current.map(
        (value, axis) => encode(value) - encode(this.#base[axis] ?? 0)
      );

      const tooBig = steps.some((step) => Math.abs(step) > SHORT_MAX);

      if (tooBig) {
        packets.position = current;
      } else if (changed || this.#tickCount % 60 === 0) {
        packets.steps = [steps[0] ?? 0, steps[1] ?? 0, steps[2] ?? 0];
      }

      const [mx, my, mz] = rocket.motion;
      const [lx, ly, lz] = this.#lastSentMovement;
      const difference = (mx - lx) ** 2 + (my - ly) ** 2 + (mz - lz) ** 2;

      if (
        difference > 1e-7 ||
        (difference > 0 && mx * mx + my * my + mz * mz === 0)
      ) {
        this.#lastSentMovement = rocket.motion;
        packets.motion = lowPrecision(rocket.motion);
      }

      if (packets.position !== undefined || packets.steps !== undefined) {
        this.#base = current;
      }
    }

    this.#tickCount += 1;

    return packets;
  }
}

export interface FireworkRocketEvents {
  // The tick the server rocket explodes; the client handles the explosion
  // event before its own tick of the same number.
  explosion?: number;
  // The tick of the server rocket's first tick: the launch sound.
  launch?: number;
}

/**
 * One firework rocket from the spawn to its last spark, with the explosion's
 * particles in the same particle engine as the trail.
 */
export class FireworkRocketSimulation {
  readonly lifetime: number;
  readonly events: FireworkRocketEvents = {};
  readonly #explosion: FireworkExplosionDefinition;
  readonly #server: Rocket;
  readonly #tracking: RocketTracking;
  readonly #client: Rocket;
  // The client rocket's VecDeltaCodec base.
  #clientBase: Vec3;
  readonly #clientRandom: LegacyRandomSource;
  readonly #particles: FireworkParticleEngine;
  ticks = 0;

  constructor(
    spawn: Vec3,
    {
      explosion = STAR_FIREWORK,
      flightDuration = 1,
      seeds = FIREWORK_ROCKET_SEEDS,
    }: {
      explosion?: FireworkExplosionDefinition;
      flightDuration?: number;
      seeds?: {
        clientEntity: bigint;
        particle: bigint;
        serverEntity: bigint;
      };
    } = {}
  ) {
    this.#explosion = explosion;
    // FireworkRocketEntity(Level, x, y, z, ItemStack) on the server.
    const random = entityRandom(seeds.serverEntity);
    const motionX = random.triangle(0, 0.002297);
    const motionZ = random.triangle(0, 0.002297);
    this.#server = new Rocket(spawn, [motionX, 0.05, motionZ]);
    this.lifetime =
      10 * (1 + flightDuration) + random.nextInt(6) + random.nextInt(7);
    this.#tracking = new RocketTracking(this.#server);

    // The client builds its rocket from the spawn packet.
    this.#clientRandom = entityRandom(seeds.clientEntity);
    const packet = this.#tracking.spawn();
    this.#client = new Rocket(packet.position, packet.motion);
    this.#clientBase = packet.position;
    this.#particles = new FireworkParticleEngine(seeds.particle);
  }

  get done() {
    return this.ticks > 0 && this.#client.removed && this.#particles.empty;
  }

  /**
   * One lockstep tick. Returns the sounds the native client asks for in it,
   * in order: the launch packet the server tick sent, then the starter's.
   */
  tick(): readonly FireworkSound[] {
    this.ticks += 1;
    const server = this.#serverTick();

    return [...server, ...this.#clientTick()];
  }

  // ServerLevel.tick: entity tracking runs before the entities tick.
  #serverTick(): FireworkSound[] {
    if (this.#server.removed) {
      return [];
    }

    const sounds: FireworkSound[] = [];
    const packets = this.#tracking.sendChanges(this.#server);

    // ClientPacketListener: the motion packet goes first, then the position.
    if (packets.motion !== undefined) {
      this.#client.motion = packets.motion;
    }

    if (packets.position !== undefined) {
      this.#clientBase = packets.position;
      [this.#client.x, this.#client.y, this.#client.z] = packets.position;
    }

    if (packets.steps !== undefined) {
      const { steps } = packets;
      const base = this.#clientBase;

      // VecDeltaCodec.decode keeps the base when no step was sent at all.
      if (steps.some((step) => step !== 0)) {
        this.#clientBase = [
          steps[0] === 0 ? base[0] : decode(encode(base[0]) + steps[0]),
          steps[1] === 0 ? base[1] : decode(encode(base[1]) + steps[1]),
          steps[2] === 0 ? base[2] : decode(encode(base[2]) + steps[2]),
        ];
      }

      [this.#client.x, this.#client.y, this.#client.z] = this.#clientBase;
    }

    this.#server.tick();

    if (this.#server.life === 1) {
      this.events.launch = this.ticks;
      // FireworkRocketEntity.tick: level.playSound(null, x, y, z, LAUNCH,
      // AMBIENT, 3.0F, 1.0F); the client plays the packet undelayed.
      sounds.push({
        pitch: 1,
        sound: "entity.firework_rocket.launch",
        source: "AMBIENT",
        volume: 3,
      });
    }

    if (this.#server.life > this.lifetime) {
      // explode: entity event 17, then discard.
      this.#server.removed = true;
      this.events.explosion = this.ticks;
      this.#particles.createFireworks(this.#client.position, this.#explosion);
      this.#client.removed = true;
    }

    return sounds;
  }

  // Minecraft.tick: entities, then the particle engine.
  #clientTick(): readonly FireworkSound[] {
    const rocket = this.#client;

    if (!rocket.removed) {
      rocket.tick();
      // The trail spark: the rocket's random draws both gaussians.
      const random = this.#clientRandom;
      const xd = random.nextGaussian() * 0.05;
      const yd = -rocket.motion[1] * 0.5;
      const zd = random.nextGaussian() * 0.05;
      this.#particles.createSpark(rocket.position, [xd, yd, zd]);
    }

    return this.#particles.tick();
  }

  /** The client rocket as the renderer sees it, or undefined once gone. */
  rocket(partialTick: number): { x: number; y: number; z: number } | undefined {
    const rocket = this.#client;

    if (rocket.removed) {
      return undefined;
    }

    return {
      x: rocket.xOld + partialTick * (rocket.x - rocket.xOld),
      y: rocket.yOld + partialTick * (rocket.y - rocket.yOld),
      z: rocket.zOld + partialTick * (rocket.z - rocket.zOld),
    };
  }

  /** Development evidence: the simulated state, as the native dumps hold it. */
  state() {
    return {
      client: this.#client.removed
        ? undefined
        : {
            life: this.#client.life,
            motion: this.#client.motion,
            old: [this.#client.xOld, this.#client.yOld, this.#client.zOld],
            position: this.#client.position,
          },
      server: this.#server.removed
        ? undefined
        : {
            life: this.#server.life,
            motion: this.#server.motion,
            position: this.#server.position,
          },
    };
  }

  quads(camera: { x: number; y: number; z: number }, partialTick: number) {
    return this.#particles.quads(camera, partialTick);
  }
}

// --- Rendering --------------------------------------------------------------

const f = Math.fround;

// The vanilla 26.2 item atlas (1024x512, one mip level, nearest sampling,
// clamped): the firework rocket sprite's texel origin.
const ITEM_ATLAS_WIDTH = 1024;
const ITEM_ATLAS_HEIGHT = 512;
const ROCKET_SPRITE = [454, 90] as const;

// item.fsh discards texels below this alpha (ITEM_CUTOUT).
const ITEM_ALPHA_CUTOUT = f(0.1);

// Lighting.updateLevel: the level's two diffuse light directions, unit
// vectors in float (only the second faces a south face).
const normalize = (x: number, y: number, z: number) => {
  const scale = f(1 / f(Math.sqrt(f(f(f(x * x) + f(y * y)) + f(z * z)))));

  return [f(x * scale), f(y * scale), f(z * scale)] as const;
};

const DIFFUSE_LIGHT_1 = normalize(f(-0.2), 1, f(0.7));

// light.glsl minecraft_mix_light for a south-facing normal: the first light
// faces away, the second contributes its z.
const SOUTH_FACE_LIGHT = Math.min(
  1,
  f(f(f(Math.max(0, DIFFUSE_LIGHT_1[2])) * f(0.6)) + f(0.4))
);

// glsl mix(x, y, a) as llvmpipe evaluates it.
const mix = (x: number, y: number, a: number) => f(x + f(f(y - x) * a));

/**
 * The rocket item as FireworkEntityRenderer submits it: the generated item
 * model's south face (the only face that covers pixels side-on; its edges
 * are edge-on and the north face is culled), GROUND transform, facing the
 * camera, drawn with the ITEM_CUTOUT pipeline before the particles.
 */
export const drawFireworkRocketItem = (
  target: FireworkTarget,
  rocket: { x: number; y: number; z: number },
  texture: PngRgba
) => {
  const { color, depth, scene } = target;
  const { camera } = scene;
  const vertex = projectVertex(scene);
  // EntityRenderDispatcher: the camera-relative position as a float
  // translation; ItemTransform (ground: translation 2/16, scale 0.5), then
  // the model's -0.5 offset, folded into the pose as Matrix4f does.
  const m30 = f(f(rocket.x - camera.x) - 0.25);
  const m31 = f(f(f(rocket.y - camera.y) + 0.125) - 0.25);
  const m32 = f(f(rocket.z - camera.z) - 0.25);
  // The generated model's south face at z = 8.5/16, scaled by 0.5.
  const z = f(m32 + 0.265625);
  const left = m30;
  const right = f(m30 + 0.5);
  const bottom = m31;
  const top = f(m31 + 0.5);
  const u0 = f(ROCKET_SPRITE[0] / ITEM_ATLAS_WIDTH);
  const u1 = f((ROCKET_SPRITE[0] + texture.width) / ITEM_ATLAS_WIDTH);
  const v0 = f(ROCKET_SPRITE[1] / ITEM_ATLAS_HEIGHT);
  const v1 = f((ROCKET_SPRITE[1] + texture.height) / ITEM_ATLAS_HEIGHT);
  const fragmentDepth = -z;
  const white = unorm8ToFloat(255);
  const vertexColor = f(white * SOUTH_FACE_LIGHT);

  const shade = (pixel: number, u: number, v: number, distance: number) => {
    const texelX = Math.min(
      texture.width - 1,
      Math.max(0, Math.floor(f(u * ITEM_ATLAS_WIDTH)) - ROCKET_SPRITE[0])
    );

    const texelY = Math.min(
      texture.height - 1,
      Math.max(0, Math.floor(f(v * ITEM_ATLAS_HEIGHT)) - ROCKET_SPRITE[1])
    );

    const texel = (texelY * texture.width + texelX) * 4;

    if (unorm8ToFloat(texture.data[texel + 3] ?? 0) < ITEM_ALPHA_CUTOUT) {
      return;
    }

    if (fragmentDepth < (depth[pixel] ?? 0)) {
      return;
    }

    depth[pixel] = fragmentDepth;

    for (let component = 0; component < 3; component += 1) {
      const lit = f(
        unorm8ToFloat(texture.data[texel + component] ?? 0) * vertexColor
      );

      // No overlay: the overlay texel is opaque white.
      const overlaid = mix(white, lit, white);
      // The noon lightmap at full sky light is white.
      const lightmapped = f(overlaid * white);
      color[pixel * 4 + component] = unorm8(
        fogComponent(lightmapped, component, distance)
      );
    }

    color[pixel * 4 + 3] = unorm8(
      f(unorm8ToFloat(texture.data[texel + 3] ?? 0) * white)
    );
  };

  // FaceInfo.SOUTH corner order, drawn as the triangles (0, 1, 2), (2, 3, 0).
  const corners = [
    vertex(left, top, z, u0, v0),
    vertex(left, bottom, z, u0, v1),
    vertex(right, bottom, z, u1, v1),
    vertex(right, top, z, u1, v0),
  ] as const;

  rasterizeTriangle(target, corners[0], corners[1], corners[2], shade);
  rasterizeTriangle(target, corners[2], corners[3], corners[0], shade);
};

// The projected reference scene (ADR 0005, case in
// packages/pixel-perfect/tests/reference/firework-rocket): a 480x640 window
// at 16 window pixels per block, the side-on camera facing north 22 blocks
// from the rocket, its eye projected to window pixel (240, 448). The camera
// eye is the declared (0.5, 80.5, 0.5) after vanilla eye-height settling.
export const FIREWORK_ROCKET_SCENE: FireworkScene = {
  camera: { x: 0.5, y: 80.49999988079071, z: 0.5 },
  eyeAt: [240, 448],
  height: 640,
  pixelsPerBlock: 16,
  width: 480,
};

export const FIREWORK_ROCKET_SPAWN = [0.5, 72, -21.5] as const;

/** The scene's window pixel the rocket launches from (its spawn position). */
export const FIREWORK_ROCKET_LAUNCH_PIXEL = [240, 584] as const;

/**
 * The scene pixels any frame draws on, launch to last spark: the union of the
 * native frames' covered bounds in the firework-rocket projected references.
 */
export const FIREWORK_ROCKET_DRAWN_BOUNDS = {
  bottom: 625,
  left: 148,
  right: 325,
  top: 302,
} as const;

/**
 * Draws one frame of the simulation: the rocket item, then the particles,
 * as the level renderer orders them.
 */
export const drawFireworkRocketFrame = (
  target: FireworkTarget,
  simulation: FireworkRocketSimulation,
  textures: { rocket: PngRgba; sprites: FireworkSprites },
  partialTick = 0
) => {
  const rocket = simulation.rocket(partialTick);

  if (rocket !== undefined) {
    drawFireworkRocketItem(target, rocket, textures.rocket);
  }

  drawFireworkQuads(
    target,
    simulation.quads(target.scene.camera, partialTick),
    textures.sprites
  );
};

/**
 * The rocket sequence after `tick` ticks since the launch, at `partialTick`
 * between ticks, as straight RGBA for the whole scene.
 */
export const renderFireworkRocketFrame = (
  textures: { rocket: PngRgba; sprites: FireworkSprites },
  tick: number,
  options: {
    backdrop?: readonly [number, number, number];
    partialTick?: number;
  } = {}
) => {
  const simulation = new FireworkRocketSimulation(FIREWORK_ROCKET_SPAWN);

  for (let step = 0; step < tick; step += 1) {
    simulation.tick();
  }

  const target = createFireworkTarget(FIREWORK_ROCKET_SCENE, options.backdrop);
  drawFireworkRocketFrame(target, simulation, textures, options.partialTick);

  return target.color;
};
