# Minecraft UI Registry

A shadcn components registry with the visual appearance of Minecraft Java's vanilla interface.

## Language

**Vanilla appearance**:
The visual appearance of Minecraft Java's own interface, including its original textures, rather than changes introduced by mods or resource packs.
_Avoid_: Modpack appearance

**Button pilot**:
The first component used to establish visual fidelity and verification before expanding the registry. It is an experiment, not a release.

**Minecraft skin**:
The Minecraft appearance applied to a component whose API and interaction behavior follow shadcn conventions.
_Avoid_: Minecraft behavior

**Vanilla reference**:
Minecraft Java 26.2 as represented by the supplied game artifact, excluding visual modifications from the surrounding modpack.

**Reference case**:
A UI element with fixed content or value, dimensions, visual state, display settings, and time or frame where applicable, backed by an independent vanilla capture.

**Pixel-perfect match**:
Zero differing pixels between a component capture and its vanilla reference case, including textures, glyphs, spacing, and text shadows.
_Avoid_: Visually close
