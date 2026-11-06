# grasscn

Pixel-perfect Minecraft UI components for the web. Copy, customize, and build on them. Built on [shadcn/ui](https://ui.shadcn.com). Open source.

![grasscn homepage: Minecraft-style title and interactive example components](./docs/images/showcase.png)

[![GitHub stars](https://shieldcn.dev/github/stars/nicognaW/grasscn.svg)](https://github.com/nicognaW/grasscn/stargazers) [![MIT license](https://shieldcn.dev/github/license/nicognaW/grasscn.svg)](./LICENSE) [![Built on shadcn/ui](https://shieldcn.dev/badge/built_on-shadcn%2Fui.svg?logo=shadcnui)](https://ui.shadcn.com)

## Quick start

Add a Minecraft button to your shadcn-ready project:

```bash
npx shadcn@latest add https://grasscn.dev/r/button.json
```

Or with Bun:

```bash
bunx --bun shadcn@latest add https://grasscn.dev/r/button.json
```

```tsx
import { Button } from "@/components/ui/button";

export default function Example() {
  return <Button>Back to Game</Button>;
}
```

![Grasscn Minecraft button labeled Back to Game](./docs/images/back-to-game.png)

### Custom folder

To install into a separate folder, add `--path`:

```bash
npx shadcn@latest add https://grasscn.dev/r/button.json --path src/components/minecraft
```

Then use the matching import (assuming `@/*` maps to `src/*`):

```tsx
import { Button } from "@/components/minecraft/button";
```

## Documentation

Visit [grasscn.dev/docs](https://grasscn.dev/docs) to explore the components and get started.

## Contributing

Found a bug or have an idea? [Open an issue](https://github.com/nicognaW/grasscn/issues).

Maintainer lint and format scope is centralized in `tooling-scope.ts`. External skill packages pinned in `skills-lock.json`, plus their `.claude/skills` mirrors, are vendored and retain their installed bytes. Unlocked project skills such as `port-minecraft-ui` remain checked; vendored skills are separate from generated code.

## License

Licensed under the [MIT license](./LICENSE).
