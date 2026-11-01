import { notFound, permanentRedirect } from "next/navigation";

import { componentSymbols } from "../../../lib/component-symbols";
import { source } from "../../../lib/source";

type PageProps = {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LegacyComponentPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const parameters = await searchParams;
  const part = Array.isArray(parameters.part)
    ? parameters.part[0]
    : parameters.part;
  const grouped =
    slug?.length === 1 && part
      ? Object.entries(componentSymbols).find(
          ([name, info]) =>
            name !== slug[0] &&
            info.registryItem === slug[0] &&
            info.exports.includes(part) &&
            source.getPage(["components", name])
        )
      : undefined;
  const groupPage = grouped
    ? source.getPage(["components", grouped[0]])
    : undefined;
  const owner =
    slug?.length === 1 ? componentSymbols[slug[0]]?.registryItem : undefined;
  const page =
    groupPage ??
    source.getPage(slug?.length ? ["components", ...slug] : undefined) ??
    (owner ? source.getPage(["components", owner]) : undefined);
  if (!page) notFound();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    if (Array.isArray(value))
      for (const entry of value) query.append(key, entry);
    else if (value !== undefined) query.append(key, value);
  }
  permanentRedirect(`${page.url}${query.size ? `?${query}` : ""}`);
}
