// Case and manifest shapes for the nether star GUI item captured references
// (packages/pixel-perfect/tests/reference/nether-star).
import { z } from "zod";

const integer = z.number().int();

export const netherStarCaseSchema = z.object({
  background: z.string().regex(/^#[0-9a-f]{6}$/u),
  cases: z
    .array(
      z.object({
        glintMillis: integer.nonnegative(),
        name: z.string().regex(/^glint-\d+$/u),
      })
    )
    .min(1),
  element: z.string(),
  item: z.literal("minecraft:nether_star"),
  language: z.literal("en_us"),
  logicalPosition: z.tuple([integer, integer]),
  minecraftVersion: z.literal("26.2"),
  minimumStableFrames: integer.positive(),
  minimumStableMilliseconds: integer.positive(),
  mods: z.array(z.never()),
  resourcePacks: z.array(z.never()),
  scale: integer.positive(),
  sentinels: z.array(z.tuple([integer, integer])).min(1),
  window: z.object({ height: integer.positive(), width: integer.positive() }),
});

export type NetherStarCase = z.infer<typeof netherStarCaseSchema>;

const sampler = z.tuple([z.string(), z.string(), z.string(), z.string()]);

export const netherStarRuntimeSchema = z.object({
  animated: z.boolean(),
  backend: z.string(),
  device: z.string(),
  driver: z.string(),
  glintSpeed: z.number(),
  glintStrength: z.number(),
  glintStrengthFloatBits: integer,
  glintTexture: z.object({
    height: integer,
    mipLevels: integer,
    sampler,
    width: integer,
  }),
  glintTextureMatrixBits: z.record(z.string(), z.array(integer).length(16)),
  guiScale: integer,
  itemAtlas: z.object({
    height: integer,
    mipLevelCount: integer,
    sampler,
    spriteUvBits: z.array(integer).length(4),
    spriteX: integer,
    spriteY: integer,
    width: integer,
  }),
  itemsFlatLightBits: z.array(z.array(integer).length(3)).length(2),
  layers: z.array(
    z.object({
      edgeQuads: z.record(z.string(), integer),
      foilType: z.string(),
      itemTransform: z.string(),
      localTransformBits: z.array(integer).length(16),
      quads: z.array(
        z.object({
          direction: z.string(),
          itemRenderType: z.string(),
          layer: z.string(),
          shade: z.boolean(),
          sprite: z.string(),
          tintIndex: integer,
          vertices: z
            .array(z.tuple([integer, integer, integer, z.string()]))
            .length(4),
        })
      ),
    })
  ),
  usesBlockLight: z.boolean(),
  vendor: z.string(),
  window: z.tuple([integer, integer]),
});

const imageIdentity = z.object({
  decodedRgbaSha256: z.string().length(64),
  file: z.string(),
  height: integer,
  sha256: z.string().length(64),
  width: integer,
});

export const netherStarManifestSchema = z.object({
  background: z.string(),
  caseDefinitionSha256: z.string().length(64),
  cases: z.array(
    z.object({
      bounds: z.tuple([integer, integer, integer, integer]),
      control: z.boolean(),
      frame: imageIdentity,
      glintMillis: integer,
      name: z.string(),
      reference: imageIdentity,
    })
  ),
  differenceTolerance: z.literal(0),
  guiScale: integer,
  harnessSources: z.array(
    z.object({ file: z.string(), sha256: z.string().length(64) })
  ),
  launches: z
    .array(
      z.object({
        captures: z.array(
          z.object({
            frame: z.string().length(64),
            name: z.string(),
            reference: z.string().length(64),
          })
        ),
        name: z.string(),
      })
    )
    .length(2),
  minecraftVersion: z.literal("26.2"),
  mods: z.array(z.never()),
  repeatDecodedRgbaEqual: z.literal(true),
  resourcePacks: z.array(z.never()),
  runtime: netherStarRuntimeSchema,
  scope: z.string(),
  source: z.string(),
  sourceJar: z.object({ path: z.string(), sha256: z.string().length(64) }),
  verifiedCoverage: z.object({
    unverified: z.array(z.string()).min(1),
    verified: z.string(),
    webAdaptations: z.array(z.string()),
  }),
  window: z.object({ height: integer, width: integer }),
});

export type NetherStarManifest = z.infer<typeof netherStarManifestSchema>;
