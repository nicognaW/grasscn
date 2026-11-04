// Declarations shared by the projected reference capture and its Pixel
// Perfect Tests (ADR 0005).
import { z } from "zod";

export const vector3 = z.tuple([z.number(), z.number(), z.number()]);

// A pixel rectangle in a native frame.
export const boundsSchema = z.object({
  height: z.number().int(),
  width: z.number().int(),
  x: z.number().int(),
  y: z.number().int(),
});

export const projectedCaseSchema = z.object({
  camera: z.object({
    // Camera eye position in world coordinates; the view is front-on.
    eye: vector3,
    xRot: z.number(),
    yRot: z.number(),
  }),
  cases: z
    .array(
      z.object({
        name: z.string().regex(/^[a-z0-9-]+$/u),
        // Top-left lamp cell of the glyph wall; columns run east, rows down.
        origin: z.tuple([z.number().int(), z.number().int(), z.number().int()]),
        rows: z.array(z.string().regex(/^[#.]+$/u)).min(1),
        value: z.string().min(1),
      })
    )
    .min(1),
  component: z.string(),
  lamps: z.object({ lit: z.string(), unlit: z.string() }),
  minecraftVersion: z.literal("26.2"),
  projection: z.object({
    facing: z.literal("north"),
    pixelsPerBlock: z.number().int().positive(),
    type: z.literal("orthographic"),
    zFar: z.number().positive(),
    zNear: z.number().positive(),
  }),
  sentinel: z.object({
    // A window pixel outside the geometry that must show the open sky.
    at: z.tuple([z.number().int(), z.number().int()]),
    description: z.string(),
  }),
  window: z.object({
    height: z.number().int().positive(),
    width: z.number().int().positive(),
  }),
  world: z.object({
    clockTime: z.number().int(),
    commands: z.array(z.string()),
    description: z.string(),
    levelName: z.string(),
    preset: z.literal("minecraft:flat"),
    seed: z.number().int(),
  }),
});

export type ProjectedCase = z.infer<typeof projectedCaseSchema>;

export const imageIdentitySchema = z.object({
  decodedRgbaSha256: z.string().length(64),
  file: z.string(),
  height: z.number().int().positive(),
  sha256: z.string().length(64),
  width: z.number().int().positive(),
});

export const projectedManifestSchema = z.object({
  caseDefinitionSha256: z.string().length(64),
  cases: z.array(
    z.object({
      backdropFrame: imageIdentitySchema,
      bounds: boundsSchema,
      coveredPixels: z.number().int().positive(),
      mask: imageIdentitySchema,
      name: z.string(),
      reference: imageIdentitySchema,
      sceneFrame: imageIdentitySchema,
      sentinel: z.object({
        at: z.tuple([z.number().int(), z.number().int()]),
        rgba: z.tuple([z.number(), z.number(), z.number(), z.number()]),
      }),
      value: z.string(),
    })
  ),
  differenceTolerance: z.literal(0),
  harnessSources: z.array(
    z.object({ file: z.string(), sha256: z.string().length(64) })
  ),
  launches: z.array(z.object({ name: z.string(), runtime: z.unknown() })),
  minecraftVersion: z.literal("26.2"),
  mods: z.array(z.string()).length(0),
  projection: z.unknown(),
  repeatDecodedRgbaEqual: z.literal(true),
  resourcePacks: z.array(z.string()).length(0),
  scope: z.string(),
  sourceJar: z.object({ path: z.string(), sha256: z.string().length(64) }),
  world: z.unknown(),
});

export type ProjectedManifest = z.infer<typeof projectedManifestSchema>;

/** Expands a glyph wall into explicit block placements for the native harness. */
export const glyphBlocks = (
  definition: ProjectedCase,
  glyph: ProjectedCase["cases"][number]
) =>
  glyph.rows.flatMap((row, rowIndex) =>
    row.split("").map((cell, column) => ({
      at: [
        glyph.origin[0] + column,
        glyph.origin[1] - rowIndex,
        glyph.origin[2],
      ],
      state: cell === "#" ? definition.lamps.lit : definition.lamps.unlit,
    }))
  );

/**
 * Window-pixel footprint of a glyph wall under the declared projection: the
 * camera sits at the window centre and the walls' south faces point at it.
 */
export const declaredFootprint = (
  definition: ProjectedCase,
  glyph: ProjectedCase["cases"][number]
) => {
  const { pixelsPerBlock } = definition.projection;
  const [eyeX, eyeY] = definition.camera.eye;
  const columns = Math.max(...glyph.rows.map((row) => row.length));

  const left =
    definition.window.width / 2 + pixelsPerBlock * (glyph.origin[0] - eyeX);

  const top =
    definition.window.height / 2 -
    pixelsPerBlock * (glyph.origin[1] + 1 - eyeY);

  return {
    height: glyph.rows.length * pixelsPerBlock,
    width: columns * pixelsPerBlock,
    x: left,
    y: top,
  };
};
