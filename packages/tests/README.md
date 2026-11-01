# Shared testing infrastructure and normal tests

This package owns the reusable renderer, artifacts, fixture host/build, dependency identity, foreground/resource coordination, checkpoint utilities and installed registry target resolution. Normal tests run without importing the PPT selector or approval coordinator. The PPT package consumes these interfaces; the package graph has no reverse dependency.

Public modules are exported as `@grasscn/tests/test`, `fixture`, `coordination`, `paths`, `dependency-identity`, `checkpoints`, `checkpoint-reporter` and `installed-registry-file`. Private code uses `@tests` aliases; fixture resolution also preserves the shadcn consumer aliases. Shared reference inputs have explicit byte-preserving relocations recorded beside them; original provenance records are unchanged.

`fixtureFile`, `referenceFile`, `registryFile` and `testFile` resolve files inside an explicit owner. They reject absolute names and parent traversal and never fall back to a different checkout for explicit consumer roots. The root logical-path resolver remains a compatibility adapter for retained evidence and callers not yet migrated.

The expansion phase retains old PPT entrypoints as forwarders and keeps commands stable. Spec #24's subsequent migration separates normal verification from explicitly chosen PPT verification and removes the forwarders after all callers migrate.
