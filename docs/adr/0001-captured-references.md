# Verify UI ports against captured Minecraft references

Grasscn establishes pixel-perfect matches by comparing UI ports with captured references produced by Minecraft Java Edition itself. Browser-generated snapshots establish regression stability but cannot independently establish that a port matches the game. Reference cases retain the game version, source identity, conditions and repeatability evidence; pixel acceptance requires zero differing decoded RGBA pixels.

This decision applies to the registry as a whole. Each UI port has its own verified coverage, recorded in `apps/web/registry/minecraft-map.json` and its linked evidence. The project's support scope is defined in `GLOSSARY.md`; a captured reference from one verified version does not establish verification of every supported version.

Native behavior and web adaptations are verified separately from appearance. A composition without a corresponding Minecraft layout can establish pixel-perfect matches for its constituent elements, while its overall layout and interactions remain web adaptations. Public styling helpers also have their own guarantees, distinct from the component's verified coverage.
