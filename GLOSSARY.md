# grasscn

A pixel-perfect port of the unmodified Minecraft Java Edition interface, provided as a shadcn components registry. The project's support scope is Minecraft Java Edition 26.2 and later.

## Language

**UI port**:
A Grasscn component that reproduces a Minecraft interface element through a shadcn-compatible API and web semantics.
_Avoid_: Minecraft skin

**Player skin**:
A Minecraft player's character texture and its associated wide or slim body model.

**Verified version**:
A supported Minecraft Java Edition version against which a port has been verified for declared reference cases. Verification of one version does not establish verification of every supported version.

**Reference case**:
A specific combination of content, UI state, dimensions, display conditions and time where applicable, with a known Minecraft result.

**Captured reference**:
An appearance or interaction result captured from Minecraft Java Edition, with its game version and reference conditions identified.

**Pixel-perfect match**:
Zero differing pixels between a UI port and its captured reference for a particular reference case, including textures, glyphs, spacing and text shadows.
_Avoid_: Visually close

**Native behavior**:
The response of a Minecraft interface element to an input or sequence of inputs, including state changes and interaction timing.

**Web adaptation**:
An interaction or composition introduced for web use that has no corresponding Minecraft behavior or layout.

**Verified coverage**:
The reference cases, game versions and environments for which a UI port's appearance or behavior has been demonstrated. Coverage applies to those declared conditions rather than every possible use of the component.
