"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

interface SectionAnchors {
  [legacyAnchor: string]: string;
}

const sections: SectionAnchors = {
  "component-composition": "composition",
  "component-import": "usage",
  "component-installation": "installation",
  "component-preview": "preview",
};

interface GroupTarget {
  from: string;
  url: string;
}

const hasFragment = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value !== "";

const rootTarget = (
  current: URL,
  rawHash: string,
  name: string,
  pages: Record<string, string>
): URL | undefined => {
  let result: URL | undefined;

  if (rawHash.startsWith("/")) {
    const legacy = new URL(rawHash, current.origin);

    if (
      legacy.origin === current.origin &&
      /^\/components(?:\/|$)/u.test(legacy.pathname)
    ) {
      result = legacy;
      result.pathname =
        result.pathname === "/components" ? "/docs" : `/docs${result.pathname}`;

      for (const [key, value] of current.searchParams) {
        if (!result.searchParams.has(key)) {
          result.searchParams.append(key, value);
        }
      }
    }
  } else {
    let url: string | undefined;

    if (name === "all") {
      url = "/docs";
    } else if (name === "chart") {
      url = "/charts";
    } else if (Object.hasOwn(pages, name)) {
      url = pages[name];
    }

    if (url !== undefined && url !== "") {
      result = new URL(url, current.origin);
      result.search = current.search;
    }
  }

  return result;
};

export const LegacyDocumentationLinks = ({
  pages,
  groups,
}: {
  pages: Record<string, string>;
  groups: Record<string, GroupTarget>;
}) => {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(
    () => {
      const update = () => {
        const current = new URL(window.location.href);
        let target = new URL(current);
        const rawHash = current.hash.slice(1);
        let name = rawHash;

        try {
          name = decodeURIComponent(rawHash);
        } catch {
          /* Preserve unknown malformed fragments. */
        }

        if (current.pathname === "/") {
          const legacy = rootTarget(current, rawHash, name, pages);

          if (legacy === undefined) {
            return;
          }

          target = legacy;
        }

        const part = target.searchParams.get("part");

        const group =
          hasFragment(part) && Object.hasOwn(groups, part)
            ? groups[part]
            : undefined;

        if (group && target.pathname === `/docs/components/${group.from}`) {
          target.pathname = group.url;
        }

        if (target.pathname.startsWith("/docs/")) {
          const sectionName = target.hash.slice(1);

          const section = Object.hasOwn(sections, sectionName)
            ? sections[sectionName]
            : undefined;

          if (section !== undefined && section !== "") {
            target.hash = section;
          } else if (!target.hash && hasFragment(part)) {
            target.hash = "usage";
          }
        }

        if (target.href === current.href) {
          return;
        }

        if (
          target.pathname !== current.pathname ||
          target.search !== current.search
        ) {
          router.replace(`${target.pathname}${target.search}${target.hash}`);
        } else {
          window.history.replaceState(window.history.state, "", target);
          const targetId = target.hash.slice(1);

          if (targetId !== "") {
            document
              .querySelector(`#${CSS.escape(targetId)}`)
              ?.scrollIntoView();
          }
        }
      };

      update();
      window.addEventListener("hashchange", update);
      window.addEventListener("popstate", update);

      return () => {
        window.removeEventListener("hashchange", update);
        window.removeEventListener("popstate", update);
      };
    },
    /* eslint-disable react/exhaustive-effect-dependencies -- The Next pathname intentionally invalidates legacy URL normalization after external navigation. */
    [pathname, router, pages, groups]
    /* eslint-enable react/exhaustive-effect-dependencies */
  );

  return null;
};
