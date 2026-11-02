"use client";

import type { Node, Root } from "fumadocs-core/page-tree";
import type { TOCItemType } from "fumadocs-core/toc";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "../registry/ui/button";
import { DocumentText } from "./document-text";

const TreeNodes = ({
  nodes,
  currentUrl,
  onNavigate,
}: {
  nodes: Node[];
  currentUrl: string;
  onNavigate: () => void;
}) => (
  <ul>
    {nodes.map((node, index) => {
      if (node.type === "separator") {
        return (
          <li
            /* eslint-disable react-doctor/no-array-index-as-key -- Fumadocs separators retain their immutable tree position when no source id exists. */
            key={node.$id ?? `separator-${index}`}
            /* eslint-enable react-doctor/no-array-index-as-key */
            data-nav-heading=""
          >
            <DocumentText>{node.name}</DocumentText>
          </li>
        );
      }

      if (node.type === "folder") {
        return (
          <li
            /* eslint-disable react-doctor/no-array-index-as-key -- Fumadocs folders retain their immutable tree position when no source id exists. */
            key={node.$id ?? `folder-${index}`}
            /* eslint-enable react-doctor/no-array-index-as-key */
          >
            {node.index ? (
              <Link
                href={node.index.url}
                aria-current={
                  currentUrl === node.index.url ? "page" : undefined
                }
                onClick={onNavigate}
              >
                <DocumentText>{node.name}</DocumentText>
              </Link>
            ) : (
              <div data-nav-heading="">
                <DocumentText>{node.name}</DocumentText>
              </div>
            )}
            <TreeNodes
              nodes={node.children}
              currentUrl={currentUrl}
              onNavigate={onNavigate}
            />
          </li>
        );
      }

      return (
        <li key={node.url}>
          <Link
            href={node.url}
            aria-current={currentUrl === node.url ? "page" : undefined}
            onClick={onNavigate}
          >
            <DocumentText>{node.name}</DocumentText>
          </Link>
        </li>
      );
    })}
  </ul>
);

export const DocumentationNavigation = ({ tree }: { tree: Root }) => {
  const currentUrl = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <aside
      /* eslint-disable shadcn/no-unknown-classes -- Defined in the explicitly imported document-navigation.css. */
      className="minecraft-docs-sidebar"
      /* eslint-enable shadcn/no-unknown-classes */
    >
      <Button
        /* eslint-disable shadcn/no-unknown-classes -- Defined in the explicitly imported document-navigation.css. */
        className="minecraft-docs-mobile-toggle"
        /* eslint-enable shadcn/no-unknown-classes */
        scale={2}
        aria-expanded={open}
        aria-controls="documentation-tree"
        onClick={() => {
          setOpen(!open);
        }}
      >
        Browse documentation
      </Button>
      <nav
        id="documentation-tree"
        aria-label="Documentation"
        data-mobile-open={open}
      >
        <TreeNodes
          nodes={tree.children}
          currentUrl={currentUrl}
          onNavigate={() => {
            setOpen(false);
          }}
        />
      </nav>
    </aside>
  );
};

export const TableOfContents = ({ items }: { items: TOCItemType[] }) => {
  if (!items.length) {
    return null;
  }

  return (
    <aside
      /* eslint-disable shadcn/no-unknown-classes -- Defined in the explicitly imported document-navigation.css. */
      className="minecraft-docs-toc"
      /* eslint-enable shadcn/no-unknown-classes */
    >
      <nav aria-label="On this page">
        <div data-nav-heading="">
          <DocumentText>On this page</DocumentText>
        </div>
        <ul>
          {items.map((item) => (
            <li key={item.url} data-depth={item.depth}>
              <a href={item.url}>
                <DocumentText>{item.title}</DocumentText>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};
