import { createFromSource } from "fumadocs-core/search/server";

import { componentSymbols } from "../../../lib/component-symbols";
import { source } from "../../../lib/source";

export const { GET } = createFromSource(source, {
  buildIndex(page) {
    const name = page.slugs[0] === "components" ? page.slugs.at(-1) : undefined;
    const hasName = name !== undefined && name !== "";
    const symbols = hasName ? (componentSymbols[name]?.exports ?? []) : [];
    const seen = new Set([page.data.title.toLowerCase()]);

    const terms = [
      ...(hasName ? [name] : []),
      ...symbols,
      ...page.data.aliases,
      ...page.data.exports,
    ].filter((content) => {
      const key = content.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    });

    const structure = page.data.structuredData;

    const heading = structure.headings.find(
      (entry) => entry.id === "usage"
    )?.id;

    return {
      description: page.data.description,
      id: page.url,
      structuredData: {
        ...structure,
        contents: [
          ...structure.contents,
          ...terms.map((content) => ({ content, heading })),
        ],
      },
      title: page.data.title,
      url: page.url,
    };
  },
});
