"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import type { SearchPage } from "../lib/search-results";
import { MinecraftText } from "../registry/ui/minecraft-text";
import { DocumentSearch } from "./document-search";
import { DocumentSelection } from "./document-selection";
import { StarButton } from "./star-button";

export const SiteFrame = ({
  children,
  searchPages,
  starCount,
}: {
  children: ReactNode;
  searchPages: SearchPage[];
  /** Formatted repository star count; omitted when it could not be loaded. */
  starCount?: string;
}) => {
  const pathname = usePathname();

  return (
    <div className="minecraft-site">
      <DocumentSelection />
      <a className="skip-link" href="#content">
        <MinecraftText>Skip to content</MinecraftText>
      </a>
      <header className="minecraft-header">
        <Link href="/" aria-label="grasscn home" className="minecraft-brand">
          <Image
            src="/grasscn-logo.svg"
            alt="grasscn"
            width={176}
            height={64}
            unoptimized
            loading="eager"
          />
        </Link>
        <nav aria-label="Main navigation">
          <Link
            href="/"
            className="minecraft-header-text-link"
            aria-current={pathname === "/" ? "page" : undefined}
          >
            <MinecraftText>Home</MinecraftText>
          </Link>
          <Link
            href="/docs"
            className="minecraft-header-text-link"
            aria-current={pathname.startsWith("/docs") ? "page" : undefined}
          >
            <MinecraftText>Components</MinecraftText>
          </Link>
          <Link href="/#examples" className="minecraft-header-text-link">
            <MinecraftText>Examples</MinecraftText>
          </Link>
          <Link
            href="/charts"
            className="minecraft-header-text-link"
            aria-current={pathname.startsWith("/charts") ? "page" : undefined}
          >
            <MinecraftText>Charts</MinecraftText>
          </Link>
        </nav>
        <DocumentSearch pages={searchPages} />
        <StarButton count={starCount} />
      </header>
      {children}
      <footer className="minecraft-footer">
        <MinecraftText>Minecraft UI. Yours to build.</MinecraftText>
      </footer>
    </div>
  );
};
