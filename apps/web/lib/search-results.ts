import type { SortedResult } from "fumadocs-core/search";

export interface SearchPage {
  url: string;
  title: string;
  description: string;
  terms: string[];
}

export interface PageSearchResult {
  id: string;
  url: string;
  title: string;
  snippet: string;
}

const plain = (text: string) => text.replaceAll(/<\/?mark>/gu, "");
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

const normalized = (text: string) =>
  plain(text)
    .toLocaleLowerCase()
    .replaceAll(/[^\p{L}\p{N}]/gu, "");

/** Present Fumadocs' full-text hits once per page; metadata only orders and labels those hits. */
export const groupSearchResults = (
  hits: SortedResult[],
  query: string,
  pages: SearchPage[]
): PageSearchResult[] => {
  const catalog = new Map(pages.map((page) => [page.url, page]));
  const grouped = new Map<string, SortedResult[]>();

  for (const hit of hits) {
    const [url] = hit.url.split("#");
    const group = grouped.get(url) ?? [];
    group.push(hit);
    grouped.set(url, group);
  }

  const term = normalized(query);

  if (!term) {
    return [];
  }

  const rankedResults = [...grouped].map(([url, matches], index) => {
    const page = catalog.get(url);

    const title =
      page?.title ??
      plain(
        matches.find((hit) => hit.type === "page")?.content ??
          matches[0].content
      );

    const names = [title, url.split("/").at(-1) ?? ""];
    const exactName = names.some((name) => normalized(name) === term);

    const exactTerm =
      page?.terms.some((value) => normalized(value) === term) ?? false;

    const prefix = names.some((name) => normalized(name).startsWith(term));
    let score = 0;

    if (prefix) {
      score = 50;
    }

    if (exactTerm) {
      score = 90;
    }

    if (exactName) {
      score = 100;
    }

    const heading = matches.find(
      (hit) => hit.type === "heading" && normalized(hit.content).includes(term)
    );

    const content = matches.find(
      (hit) => hit.type === "text" && plain(hit.content).length > 40
    );

    const destination = heading ?? content ?? matches[0];

    const snippet = plain(
      content?.content ?? heading?.content ?? page?.description ?? ""
    );

    return {
      index,
      result: {
        id: url,
        snippet: Array.from(
          graphemes.segment(snippet),
          (entry) => entry.segment
        )
          .slice(0, 180)
          .join(""),
        title,
        url: score >= 90 ? url : destination.url,
      },
      score,
    };
  });

  rankedResults.sort(
    (first, second) => second.score - first.score || first.index - second.index
  );

  return rankedResults.map((entry) => entry.result);
};
