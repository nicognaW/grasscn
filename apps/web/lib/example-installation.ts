import registry from "../registry.json";
import { installationDestination } from "./installation";

/** Resolve the exact copied module's consumer imports to their distributed owners. */
export const exampleInstallation = (code: string): string[] => {
  const names = new Set<string>();

  for (const match of code.matchAll(
    /\bfrom\s*["'](?<specifier>@\/components\/[^"']+)["']/gu
  )) {
    const specifier = match.groups?.specifier;

    if (specifier === undefined || specifier.length === 0) {
      continue;
    }

    const target = specifier.slice(2);

    const candidates = registry.items.filter((item) =>
      item.files.some(
        (file) =>
          installationDestination(file).replace(/\.(?:ts|tsx)$/u, "") === target
      )
    );

    const basename = target.split("/").at(-1);

    let owner = candidates.find((item) => item.name === basename);

    if (owner === undefined) {
      const candidatesByFileCount = candidates.slice();
      candidatesByFileCount.sort(
        (left, right) => left.files.length - right.files.length
      );
      owner = candidatesByFileCount.at(0);
    }

    if (owner === undefined) {
      throw new Error(
        `No distributed installation for example import: ${specifier}`
      );
    }

    names.add(owner.name);
  }

  const sortedNames = [...names];
  sortedNames.sort();

  return sortedNames;
};
