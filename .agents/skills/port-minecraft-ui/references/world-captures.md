# World captures and software rendering

Native captures of world renderings (blocks, items in the world, particles, entity sounds) are projected references ([ADR 0005](../../../../docs/adr/0005-projected-references.md)). This file covers the harnesses that make them, how to run them on Linux, and rasterizer facts recovered while porting the Redstone Lamp display, fireworks and nether star.

## Running a capture on Linux

- Use the unmodified 26.2 client (`versions/26.2`, JAR SHA-256 `40896ee9…afa290`), JDK 25, and `xvfb-run -a -s "-screen 0 1920x1080x24"`. Under Xvfb the client renders on Mesa llvmpipe (OpenGL 4.5 core). GUI captures match the committed Windows-GPU references byte for byte. Record `llvmpipe/Xvfb` in the manifest of every world corpus.
- There is no audio device, so OpenAL fails and the client continues silently. Recover sound events, pitch, volume and delay by hooking `SoundManager.play`/`playDelayed` (see `ParticleSeedAgent.java`) or from bytecode, never from audio output.
- Pass fresh work and output directories to every launcher. Each launcher runs two launches, asserts the JAR hash, and requires identical decoded RGBA across them.

## Harnesses

All launchers live in `packages/pixel-perfect/src/native/capture/`. Their Java sources and case schemas sit beside each corpus.

| Kind | Java | Launcher | Corpus |
| --- | --- | --- | --- |
| Block wall (lamp display) | `tests/reference/projected/ProjectedReferenceMain.java` | `capture-projected-reference.ts` | `tests/reference/redstone-lamp-display/` |
| Particles at fixed ticks (`firework`) | same, plus `ParticleSeedAgent.java` | `capture-projected-firework.ts` | `tests/reference/fireworks/` |
| Entity plus particles in lockstep (`firework-rocket`) | same | `capture-projected-firework-rocket.ts` | `tests/reference/firework-rocket/` |
| Sound events by listener distance | same | `capture-firework-sounds.ts` | `packages/tests/fixtures/reference/firework-sounds/` |
| GUI item with time-based glint | `tests/reference/gui-item/NetherStarReferenceMain.java`, `GlintClockAgent.java` | `capture-nether-star-reference.ts` | `tests/reference/nether-star/` |

- **World:** a fresh flat world via `WorldOpenFlows.createFreshLevel`: spectator, peaceful, time and weather frozen, random ticks 0, at noon with clear weather.
- **Projection:** only `Camera.projection` is replaced, by `DeclaredOrthographicProjection` (pixels per block, optional `eyeAt` for an off-centre eye). Culling stays vanilla perspective (fov 70). At depth d the frustum spans ±0.70d vertically and ±0.525d horizontally. Choose the camera distance so the whole subject survives culling.
- **Ticks:** `SteppedTimer` replaces `Minecraft.deltaTracker` and runs only harness-requested ticks at partialTick 0. `/tick freeze` is the wrong tool: while frozen, `getGameTimeDeltaPartialTick(false)` returns 1.0.
- **Entities:** `ServerGate` holds the integrated server between ticks, so each step is one server tick, then every packet of that tick, then one client tick. Without it, position packets land at random ticks.
- **Seeds:** vanilla seeds every particle and entity from nanoTime. `ParticleSeedAgent` rewrites only that call to draw from a declared seed stream, one stream each for server entities, client entities and client particles. The random algorithm stays vanilla.
- **Masks:** the mask is the scene frame against a backdrop frame without the subject (`deriveGeometryMask`). Compare only covered pixels with `compareMasked` in `packages/pixel-perfect/src/harness/projected-reference.ts`. Each comparator route needs a one-pixel negative control run on a temporary copy of the corpus.
- **Sound distance:** `FireworkParticles.Starter` picks `_far` variants at 16 blocks or more and delays blast and twinkle by distance/2 ticks beyond 10 blocks. Place the listener accordingly, or declare the adaptation.

## llvmpipe raster facts

These hold for llvmpipe and are what made the ports exact. Check them first when a world port is off by one level.

- **unorm8 to float:** vertex colour, alpha and texels convert as `float(byte) * (1/255f)`, which is not the correctly rounded `byte / 255`. The two differ for 126 of 256 values. Use one helper (`unorm8ToFloat` in `minecraft-firework-explosion.ts`) for every 8-bit input.
- **Float to unorm8 and blending:** the source is converted as `x * (255/256)` in float plus 2^15, rounded half to even. The 8-bit blend multiply is `(ab + (ab >> 8) + 0x80) >> 8`, not correctly rounded (253 × 191 gives 189).
- **Rasterizer:** window coordinates snap to 1/256 px (round half to even) and edge functions are integer. The fill rule includes left edges and GL-bottom edges, which are the top edge of the stored, flipped frame.
- **Attributes:** plane setup is per triangle and evaluated with fused multiply-adds (`f(dady*y + f(dadx*x + a0))`). This decides texels exactly at sample boundaries.
- **Fog:** atmospheric fog is linear from 0 to 1024 blocks towards (181, 208, 255). Its distance is `length(position)` per vertex, interpolated over each triangle. A wall far from the camera centre gets a different fog value per pixel.
- **Mipmaps:** at half size, blocks sample level 1 of `MipmapGenerator`'s linear-light mean, at texel centres (NEAREST). The particle atlas (512×256) and item atlas (1024×512) have one mip level and use NEAREST with clamp.
- **Depth:** `DepthStencilState.DEFAULT` is GEQUAL with depth writes. Under the declared non-reversed orthographic projection the farther fragment wins. Particles are not sorted, so draw them in queue order.
