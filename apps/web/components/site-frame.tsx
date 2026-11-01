"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Button } from "../registry/ui/button";
import { MinecraftText } from "../registry/ui/minecraft-text";
import { DocumentSearch } from "./document-search";

export function SiteFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="minecraft-site">
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
          <Button
            nativeButton={false}
            render={
              <Link
                href="/docs"
                role="link"
                aria-current={pathname.startsWith("/docs") ? "page" : undefined}
              />
            }
            scale={2}
          >
            Components
          </Button>
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
        <DocumentSearch />
        <a
          className="minecraft-github"
          href="https://github.com/nicognaW/grasscn"
        >
          <MinecraftText>GitHub</MinecraftText>
        </a>
      </header>
      {children}
      <footer className="minecraft-footer">
        <MinecraftText>Minecraft UI. Yours to build.</MinecraftText>
      </footer>
    </div>
  );
}
