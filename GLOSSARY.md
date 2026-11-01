# grasscn

A pixel-perfect port of the unmodified Minecraft interface, provided as a shadcn components registry.

## Language

**UI port**:
A Grasscn component that reproduces a Minecraft interface element through a shadcn-compatible API and web semantics.
_Avoid_: Minecraft skin

**Player skin**:
A Minecraft player's character texture and its associated wide or slim body model.

**Verified version**:
A Minecraft version against which a UI port has been verified for declared reference cases. Verification of one version does not establish verification of every supported version.

**Reference case**:
A specific combination of content, UI state, dimensions, display conditions and time where applicable, with a known Minecraft result.

**Captured reference**:
An appearance or interaction result captured from Minecraft, with its game version and reference conditions identified.

**Pixel-perfect match**:
Zero differing pixels between a UI port and its captured reference for a particular reference case, including textures, glyphs, spacing and text shadows.
_Avoid_: Visually close

**Native behavior**:
The response of a Minecraft interface element to an input or sequence of inputs, including state changes and interaction timing.

**Web adaptation**:
An interaction or composition introduced for web use that has no corresponding Minecraft behavior or layout.

**Verified coverage**:
The reference cases, game versions and environments for which a UI port's appearance or behavior has been demonstrated. Coverage applies to those declared conditions rather than every possible use of the component.

**Website default path**:
The ordinary content, state and interaction presented by a component's default Grasscn website demo.

**Base mapping**:
The recorded relationship between one Grasscn browser test case and a website default path or an actual upstream shadcn test.

**Base tests**:
Grasscn browser tests selected to cover the default usage paths presented on the website or to correspond to actual upstream shadcn tests.

**Full tests**:
The remaining Grasscn browser tests outside Base tests, covering additional reference cases, variants and edge cases.

**Full test run**:
An approved execution of Full tests against one fixed source and environment snapshot. Resuming interrupted portions against that same snapshot continues the same run.

**Full run issue**:
The dedicated record of one Full test run, identifying its source, scope, environment, authorization, progress and result.
