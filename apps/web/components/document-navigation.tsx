"use client";

import type { Node, Root } from "fumadocs-core/page-tree";
import type { TOCItemType } from "fumadocs-core/toc";
import Link from "next/link";
import { useState } from "react";

import { Button } from "../registry/ui/button";
import { MinecraftText } from "../registry/ui/minecraft-text";

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
            /* eslint-disable react-doctor/no-array-index-as-key -- These positions identify immutable generated document segments; text and source identity own replacement. */
            key={node.$id ?? index}
            /* eslint-enable react-doctor/no-array-index-as-key */
            /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/document-navigation.css and loaded by the documentation layout. */
            className="minecraft-nav-heading"
            /* eslint-enable shadcn/no-unknown-classes */
          >
            <MinecraftText>{node.name}</MinecraftText>
          </li>
        );
      }

      if (node.type === "folder") {
        return (
          <li
            /* eslint-disable react-doctor/no-array-index-as-key -- These positions identify immutable generated document segments; text and source identity own replacement. */
            key={node.$id ?? index}
            /* eslint-enable react-doctor/no-array-index-as-key */
          >
            {node.index ? (
              /* eslint-disable jsx-a11y/control-has-associated-label -- The composed native control derives its accessible label from its visible rendered children. */
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={node.index.url}

                    /* eslint-disable jsx-a11y/prefer-tag-over-role -- Keep the native component tag, CSS geometry and explicit composed ARIA role together. */
                    role="link"
                    /* eslint-enable jsx-a11y/prefer-tag-over-role */

                    aria-current={
                      currentUrl === node.index.url ? "page" : undefined
                    }
                    onClick={onNavigate}
                  />
                }
                scale={1}
              >
                {node.name}
              </Button>
            ) : (
              /* eslint-enable jsx-a11y/control-has-associated-label */

              <span /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/document-navigation.css and loaded by the documentation layout. */
                className="minecraft-nav-heading"
                /* eslint-enable shadcn/no-unknown-classes */
              >
                <MinecraftText>{node.name}</MinecraftText>
              </span>
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
        <li
          /* eslint-disable react-doctor/no-array-index-as-key -- These positions identify immutable generated document segments; text and source identity own replacement. */
          key={node.url}
          /* eslint-enable react-doctor/no-array-index-as-key */
        >
          {/* eslint-disable jsx-a11y/control-has-associated-label -- The composed native control derives its accessible label from its visible rendered children. */}
          <Button
            nativeButton={false}
            render={
              <Link
                href={node.url}

                /* eslint-disable jsx-a11y/prefer-tag-over-role -- Keep the native component tag, CSS geometry and explicit composed ARIA role together. */
                role="link"
                /* eslint-enable jsx-a11y/prefer-tag-over-role */

                aria-current={currentUrl === node.url ? "page" : undefined}
                onClick={onNavigate}
              />
            }
            scale={1}
          >
            {node.name}
          </Button>
          {/* eslint-enable jsx-a11y/control-has-associated-label */}
        </li>
      );
    })}
  </ul>
);

export const DocumentationNavigation = ({
  tree,
  currentUrl,
}: {
  tree: Root;
  currentUrl: string;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <aside /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/document-navigation.css and loaded by the documentation layout. */
      className="minecraft-docs-sidebar"
      /* eslint-enable shadcn/no-unknown-classes */
    >
      {/* eslint-disable jsx-a11y/control-has-associated-label -- The composed native control derives its accessible label from its visible rendered children. */}
      <Button
        /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/document-navigation.css and loaded by the documentation layout. */
        className="minecraft-docs-mobile-toggle"
        /* eslint-enable shadcn/no-unknown-classes */
        scale={1}
        aria-expanded={open}
        aria-controls="documentation-tree"
        onClick={() => {
          setOpen(!open);
        }}
      >
        Browse documentation
      </Button>
      {/* eslint-enable jsx-a11y/control-has-associated-label */}
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
    <aside /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/document-navigation.css and loaded by the documentation layout. */
      className="minecraft-docs-toc"
      /* eslint-enable shadcn/no-unknown-classes */
    >
      <nav aria-label="On this page">
        <MinecraftText>On this page</MinecraftText>
        <ul>
          {items.map((item) => (
            <li
              /* eslint-disable react-doctor/no-array-index-as-key -- These positions identify immutable generated document segments; text and source identity own replacement. */
              key={item.url}
              /* eslint-enable react-doctor/no-array-index-as-key */
              data-depth={item.depth}
            >
              {/* eslint-disable jsx-a11y/control-has-associated-label -- The composed native control derives its accessible label from its visible rendered children. */}
              <Button
                nativeButton={false}
                render={
                  <a
                    href={item.url}
                    /* eslint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/no-redundant-roles -- Base UI Button supplies button semantics unless its anchor render explicitly restores the link role. */
                    role="link"
                    /* eslint-enable jsx-a11y/prefer-tag-over-role, jsx-a11y/no-redundant-roles */
                  />
                }
                scale={1}
              >
                {item.title}
              </Button>
              {/* eslint-enable jsx-a11y/control-has-associated-label */}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};
