"use client";

import { useDocsSearch } from "fumadocs-core/search/client";
import { fetchClient } from "fumadocs-core/search/client/fetch";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from "../registry/ui/command";
import { MinecraftText } from "../registry/ui/minecraft-text";

import "./document-search.css";

const client = fetchClient();
const plain = (text: string) => text.replaceAll(/<\/?mark>/gu, "");

export const DocumentSearch = () => {
  const router = useRouter();
  const pathname = usePathname();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const { search, setSearch, query } = useDocsSearch({ client });

  const results =
    !query.isLoading && !query.error && Array.isArray(query.data)
      ? query.data
      : [];

  /* eslint-disable react/exhaustive-effect-dependencies, react/set-state-in-effect -- The Next pathname intentionally invalidates the search session when external navigation changes. */
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", shortcut);

    return () => {
      window.removeEventListener("keydown", shortcut);
    };
  }, []);
  /* eslint-enable react/exhaustive-effect-dependencies, react/set-state-in-effect */

  /* eslint-disable react/exhaustive-effect-dependencies, react/set-state-in-effect -- The Next pathname intentionally invalidates the search session when external navigation changes. */
  useEffect(() => {
    setOpen(false);
    setSearch("");
  }, [pathname, setSearch]);
  /* eslint-enable react/exhaustive-effect-dependencies, react/set-state-in-effect */

  let message = "No results. Try another search.";

  if (query.error) {
    message = "Search unavailable. Try again or browse the documentation.";
  } else if (query.isLoading) {
    message = "Searching...";
  } else if (query.data === "empty") {
    message = "Search names, exports, or documentation text.";
  } else if (results.length > 0) {
    message = `${results.length} results`;
  }

  return (
    /* eslint-disable jsx-a11y/no-noninteractive-element-interactions -- The search region observes focus leaving its interactive descendants. */
    <div
      /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/document-search.css and loaded by the documentation layout. */
      className="minecraft-search"
      /* eslint-enable shadcn/no-unknown-classes */

      /* eslint-disable jsx-a11y/prefer-tag-over-role -- Keep the native component tag, CSS geometry and explicit composed ARIA role together. */
      role="search"
      /* eslint-enable jsx-a11y/prefer-tag-over-role */

      aria-label="Documentation"

      /* eslint-disable jsx-a11y/no-noninteractive-element-interactions -- This search region observes focus leaving its interactive descendants. */
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
      /* eslint-enable jsx-a11y/no-noninteractive-element-interactions */
    >
      <Command
        shouldFilter={false}
        scale={2}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          }

          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            setOpen(true);
          }
        }}
      >
        <CommandInput
          ref={input}
          aria-label="Search documentation"
          aria-expanded={open}
          placeholder="Find documentation..."
          value={search}
          onValueChange={(value) => {
            setSearch(value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
          }}
        />
        {open && (
          <div /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/document-search.css and loaded by the documentation layout. */
            className="minecraft-search-popup"
            /* eslint-enable shadcn/no-unknown-classes */
          >
            <CommandList
              aria-label="Search results"
              aria-busy={query.isLoading}
            >
              {results.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.id}
                  aria-label={plain(result.content)}
                  onSelect={() => {
                    router.push(result.url);
                    setOpen(false);
                    setSearch("");
                    input.current?.blur();
                  }}
                >
                  {plain(result.content)}
                  <span /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/document-search.css and loaded by the documentation layout. */
                    className="minecraft-search-context"
                    /* eslint-enable shadcn/no-unknown-classes */
                  >
                    {result.url}
                  </span>
                </CommandItem>
              ))}
            </CommandList>
            <div
              /* eslint-disable jsx-a11y/prefer-tag-over-role -- Keep the native component tag, CSS geometry and explicit composed ARIA role together. */
              role="status"
              /* eslint-enable jsx-a11y/prefer-tag-over-role */
              /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/document-search.css and loaded by the documentation layout. */
              className="minecraft-search-status"
              /* eslint-enable shadcn/no-unknown-classes */
            >
              <MinecraftText>{message}</MinecraftText>
            </div>
          </div>
        )}
      </Command>
    </div>
    /* eslint-enable jsx-a11y/no-noninteractive-element-interactions */
  );
};
