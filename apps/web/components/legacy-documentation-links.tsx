"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const sections: Record<string, string> = {
  "component-preview": "preview",
  "component-installation": "installation",
  "component-import": "usage",
  "component-composition": "composition",
};

type GroupTarget = { from: string; url: string };
export function LegacyDocumentationLinks({
  pages,
  groups,
}: {
  pages: Record<string, string>;
  groups: Record<string, GroupTarget>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
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
        if (rawHash.startsWith("/")) {
          const legacy = new URL(rawHash, current.origin);
          if (
            legacy.origin !== current.origin ||
            !/^\/components(?:\/|$)/.test(legacy.pathname)
          )
            return;
          target = legacy;
          target.pathname =
            target.pathname === "/components"
              ? "/docs"
              : `/docs${target.pathname}`;
          for (const [key, value] of current.searchParams)
            if (!target.searchParams.has(key))
              target.searchParams.append(key, value);
        } else {
          const url =
            name === "all"
              ? "/docs"
              : name === "chart"
                ? "/charts"
                : Object.hasOwn(pages, name)
                  ? pages[name]
                  : undefined;
          if (!url) return;
          target = new URL(url, current.origin);
          target.search = current.search;
        }
      }
      const part = target.searchParams.get("part");
      const group =
        part && Object.hasOwn(groups, part) ? groups[part] : undefined;
      if (group && target.pathname === `/docs/components/${group.from}`)
        target.pathname = group.url;
      if (target.pathname.startsWith("/docs/")) {
        const sectionName = target.hash.slice(1);
        const section = Object.hasOwn(sections, sectionName)
          ? sections[sectionName]
          : undefined;
        if (section) target.hash = section;
        else if (!target.hash && part) target.hash = "usage";
      }
      if (target.href === current.href) return;
      if (
        target.pathname !== current.pathname ||
        target.search !== current.search
      )
        router.replace(`${target.pathname}${target.search}${target.hash}`);
      else {
        window.history.replaceState(window.history.state, "", target);
        document.getElementById(target.hash.slice(1))?.scrollIntoView();
      }
    };
    update();
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("popstate", update);
    };
  }, [pathname, router, pages, groups]);
  return null;
}
