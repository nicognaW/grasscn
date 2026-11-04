"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

import { minecraftGlyphs } from "./minecraft-font";
import {
  isMinecraftRefCallback,
  isMinecraftRefCleanup,
  isMinecraftTextContent,
  minecraftClasses as cn,
  minecraftStyle,
} from "./minecraft-render";
import type { MinecraftProps } from "./minecraft-render";
import { playMinecraftClick } from "./minecraft-sound";
import { minecraftTabsAssets as assets } from "./minecraft-tabs-assets";
import { tabsUnihexAtlas } from "./minecraft-tabs-atlas";
import { MinecraftText } from "./minecraft-text";
import { MinecraftUnicodeLabel } from "./minecraft-unicode-label";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";

import "./minecraft-tabs.css";

interface TabsTextureStyle extends React.CSSProperties {
  "--mc-tabs-image": string;
}

const tabLabelAdvance = function tabLabelAdvance(glyphText: string) {
  let accumulatedGlyphAdvance = 0;

  for (const advanceCharacter of glyphText) {
    accumulatedGlyphAdvance +=
      minecraftGlyphs[
        // SAFETY: String iteration supplies a nonempty character, so its first code point exists.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The intrinsic string iterator proves this specific codePointAt(0) result.
        (advanceCharacter.codePointAt(0) as number) - 32
      ]?.[2] ??
      getUnihexGlyph(advanceCharacter)?.advance ??
      6;
  }

  return accumulatedGlyphAdvance;
};

interface TabsHeaderStyle extends React.CSSProperties {
  "--mc-tab-header": string;
}

interface TabsScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

const ScaleContext = React.createContext(2);

const useLocalRef = function useLocalRef<T extends HTMLElement>(
  forwarded: React.Ref<T> | undefined
) {
  const local = React.useRef<T>(null);
  const [element, setElement] = React.useState<T | null>(null);

  const callback = React.useCallback(
    (node: T | null): (() => void) | undefined => {
      local.current = node;
      setElement(node);

      if (isMinecraftRefCallback(forwarded)) {
        const cleanup = forwarded(node);

        if (isMinecraftRefCleanup(cleanup)) {
          return () => {
            local.current = null;
            setElement(null);
            cleanup();
          };
        }
      } else if (forwarded) {
        forwarded.current = node;
      }

      return undefined;
    },
    [forwarded]
  );

  return [local, callback, element] as const;
};

type TabsProps = Omit<
  MinecraftProps<typeof TabsPrimitive.Root>,
  "orientation"
> & {
  orientation?: "horizontal";
  scale?: 1 | 2 | 3;
};

const Tabs = ({
  className,
  scale = 2,
  orientation = "horizontal",
  style,
  ref,
  onValueChange,
  ...props
}: TabsProps) => {
  if (orientation !== "horizontal") {
    throw new Error("Minecraft menu tabs support horizontal orientation only");
  }

  const [, forwarded, element] = useLocalRef(ref);

  const requested = React.useRef<string | undefined>(undefined);
  const expiry = React.useRef(0);

  React.useLayoutEffect((): (() => void) | undefined => {
    const root = element;

    if (!root) {
      return undefined;
    }

    const current = () =>
      [
        ...root.querySelectorAll<HTMLElement>(
          '[data-slot="tabs-trigger"][data-active]'
        ),
      ].find((tab) => tab.closest(".mc-tabs") === root)?.dataset.mcTabValue;

    let previous = current();

    const observer = new MutationObserver(() => {
      const next = current();

      if (next !== previous) {
        if (next !== undefined && requested.current === next) {
          playMinecraftClick();
        }

        requested.current = undefined;
        previous = next;
      }
    });

    observer.observe(root, {
      attributeFilter: ["data-active"],
      attributes: true,
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      cancelAnimationFrame(expiry.current);
    };
  }, [element]);

  return (
    <ScaleContext.Provider value={scale}>
      <TabsPrimitive.Root
        ref={forwarded}
        data-slot="tabs"
        orientation={orientation}
        className={cn(`mc-tabs`, className)}
        style={minecraftStyle(style, (__style): TabsScaleStyle => ({
          "--mc-scale": scale,
          ...__style,
        }))}
        onValueChange={(next, details) => {
          requested.current = details.reason === "none" ? next : undefined;
          cancelAnimationFrame(expiry.current);
          expiry.current = requestAnimationFrame(() => {
            requested.current = undefined;
          });
          onValueChange?.(next, details);
        }}
        {...props}
      />
    </ScaleContext.Provider>
  );
};

const tabsListVariants = cva("mc-tabs-list", {
  defaultVariants: { variant: "default" },
  variants: { variant: { default: "mc-tabs-list-default" } },
});

type TabsListProps = MinecraftProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>;

const TabsList = ({
  className,
  variant = "default",
  style,
  ref,
  children,
  render,
  ...props
}: TabsListProps) => {
  if (variant && variant !== "default") {
    throw new Error("Minecraft menu tabs support the default variant only");
  }

  const scale = React.useContext(ScaleContext);
  const [, forwarded, element] = useLocalRef(ref);

  React.useLayoutEffect((): (() => void) | undefined => {
    if (!element) {
      return undefined;
    }

    const measure = () => {
      const width = Math.floor(element.clientWidth / scale);

      const count = Math.max(
        1,
        element.querySelectorAll(':scope > [data-slot="tabs-trigger"]').length
      );

      const available = Math.max(0, Math.min(400, width) - 28);
      const tabWidth = Math.ceil(Math.floor(available / count) / 2) * 2;
      const left = Math.ceil(Math.floor((width - available) / 2) / 2) * 2;
      element.style.setProperty("--mc-tab-width", `${tabWidth * scale}px`);
      element.style.setProperty("--mc-tabs-left", `${left * scale}px`);
      element.style.setProperty(
        "--mc-tabs-end",
        `${(left + tabWidth * count) * scale}px`
      );
      element.dataset.mcTabsReady = "true";
    };

    measure();

    const resize = new ResizeObserver(measure);
    const childrenObserver = new MutationObserver(measure);

    resize.observe(element);
    childrenObserver.observe(element, { childList: true });

    return () => {
      resize.disconnect();
      childrenObserver.disconnect();
    };
  }, [scale, element]);
  const content = children;

  return (
    <TabsPrimitive.List
      render={render}
      ref={forwarded}
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(`${tabsListVariants({ variant })} `, className)}
      style={minecraftStyle(style, (__style): TabsHeaderStyle => ({
        "--mc-tab-header": assets.textures.header_separator,
        ...__style,
      }))}
      {...props}
    >
      {content}
    </TabsPrimitive.List>
  );
};

const TabSurface = ({ name }: { name: keyof typeof assets.sprites }) => (
  <span className="mc-tab-surface" data-sprite={name} aria-hidden="true">
    {assets.sprites[name].pieces.map((image, index) => (
      <i
        key={index}
        style={
          // SAFETY: The owned texture value is a string checked by TabsTextureStyle; the assertion supplies React’s CSSProperties view of its required custom property.
          {
            "--mc-tabs-image": image,
          } satisfies TabsTextureStyle as TabsTextureStyle
        }
      />
    ))}
  </span>
);

type TabsTriggerProps = MinecraftProps<typeof TabsPrimitive.Tab>;

const TabsTrigger = ({
  className,
  style,
  ref,
  children,
  render,
  value,
  ...props
}: TabsTriggerProps) => {
  const scale = React.useContext(ScaleContext);
  const [, forwarded, element] = useLocalRef(ref);

  const content = children;

  const text = isMinecraftTextContent(content) ? String(content) : null;

  React.useLayoutEffect((): (() => void) | undefined => {
    let cancelled = false;
    let frame = 0;

    if (!element) {
      return undefined;
    }

    const update = () => {
      const width = Math.floor(element.clientWidth / scale);

      const textWidth =
        text === null
          ? Math.ceil(
              (element
                .querySelector<HTMLElement>("[data-mc-tabs-rich]")
                ?.getBoundingClientRect().width ?? 0) / scale
            )
          : Math.ceil(tabLabelAdvance(text));

      const overflow = textWidth - (width - 2);
      let left = Math.floor(width / 2) - Math.floor(textWidth / 2);

      if (overflow > 0) {
        const seconds = Date.now() / 1000;
        const period = Math.max(overflow * 0.5, 3);

        const phase =
          Math.sin((Math.PI / 2) * Math.cos((Math.PI * 2 * seconds) / period)) /
            2 +
          0.5;

        left = 1 - Math.trunc(phase * overflow);
      }

      const underline = Math.min(textWidth, width - 4);
      element.style.setProperty("--mc-tab-label-x", `${(left - 1) * scale}px`);
      element.style.setProperty(
        "--mc-tab-underline-x",
        `${Math.floor((width - underline) / 2) * scale}px`
      );
      element.style.setProperty(
        "--mc-tab-underline-width",
        `${underline * scale}px`
      );
      element.dataset.mcTabReady = "true";

      if (!cancelled) {
        frame = requestAnimationFrame(update);
      }
    };

    const unicode = text !== null && /\P{ASCII}/u.test(text);

    if (unicode) {
      const fontLoading = loadUnihex();

      const commitFontReadiness = async () => {
        await fontLoading;

        if (!cancelled) {
          update();
        }
      };

      void commitFontReadiness();
    } else {
      update();
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [text, scale, element]);

  let label: React.ReactNode;

  if (text === null) {
    label = <span data-mc-tabs-rich="">{content}</span>;
  } else if (/^[\u0020-\u007E]*$/u.test(text)) {
    label = <MinecraftText>{text}</MinecraftText>;
  } else {
    label = <MinecraftUnicodeLabel text={text} atlas={tabsUnihexAtlas} />;
  }

  const artwork = (
    <>
      <TabSurface name="tab" />
      <TabSurface name="tab_highlighted" />
      <TabSurface name="tab_selected" />
      <TabSurface name="tab_selected_highlighted" />
      <span
        className="mc-tab-menu"
        aria-hidden="true"
        style={
          // SAFETY: The owned texture value is a string checked by TabsTextureStyle; the assertion supplies React’s CSSProperties view of its required custom property.
          {
            "--mc-tabs-image": assets.textures.menu_background,
          } satisfies TabsTextureStyle as TabsTextureStyle
        }
      />
      <span className="mc-tab-underline" aria-hidden="true" />
      <span className="mc-tab-label-window">
        <span className="mc-tab-label">{label}</span>
      </span>
    </>
  );

  return (
    <TabsPrimitive.Tab
      render={render}
      ref={forwarded}
      value={value}
      data-slot="tabs-trigger"
      data-mc-tab-value={value}
      className={cn(`mc-tabs-trigger`, className)}
      style={style}
      {...props}
    >
      {artwork}
    </TabsPrimitive.Tab>
  );
};

const TabsContent = ({
  className,
  style,
  ...props
}: MinecraftProps<typeof TabsPrimitive.Panel>) => (
  <TabsPrimitive.Panel
    data-slot="tabs-content"
    className={cn(`mc-tabs-content`, className)}
    style={minecraftStyle(style, (__style): TabsTextureStyle => ({
      "--mc-tabs-image": assets.textures.menu_background,
      ...__style,
    }))}
    {...props}
  />
);

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };

export type { TabsProps, TabsListProps, TabsTriggerProps };
