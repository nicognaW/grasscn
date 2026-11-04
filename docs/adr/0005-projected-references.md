# Capture world renderings under a declared orthographic projection

UI ports of world renderings (block displays such as the Redstone Lamp display, and firework rockets with their particles) are verified against projected references: the unmodified Minecraft renderer with only the camera projection matrix replaced by a declared orthographic projection. Textures, mipmaps, shaders, lighting, particles, sound and random sources stay vanilla.

Vanilla perspective makes each block cell and particle depend on its screen position and camera distance, so reference cases would multiply with every layout and the web port would need to reproduce perspective rasterization. Orthographic projection makes identical blocks render identically anywhere and maps world units linearly to page pixels. A projected reference therefore establishes a pixel-perfect match only under its declared projection, not under the game's default camera.

## Considered Options

- Vanilla perspective, one scene per glyph: unmodified, but couples coverage to camera framing and multiplies cases.
- GUI item rendering: unmodified and established for icons, but cannot show a flat block wall or world particles.
