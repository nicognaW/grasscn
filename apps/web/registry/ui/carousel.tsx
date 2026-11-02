"use client";

import useEmblaCarousel from "embla-carousel-react";
import type { UseEmblaCarouselType } from "embla-carousel-react";
import * as React from "react";

import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { playMinecraftClick } from "./minecraft-sound";

import "./minecraft-pagination.css";
import "./minecraft-pagination-assets.css";
import "./minecraft-carousel.css";

interface CarouselScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

type CarouselApi = UseEmblaCarouselType[1];

type CarouselOptions = Parameters<typeof useEmblaCarousel>[0];

type CarouselPlugin = Parameters<typeof useEmblaCarousel>[1];

interface CarouselProps {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: "horizontal" | "vertical";
  setApi?: (api: CarouselApi) => void;
  scale?: 1 | 2 | 3;
}

type CarouselContextProps = CarouselProps & {
  scale: 1 | 2 | 3;
  carouselRef: UseEmblaCarouselType[0];
  api: CarouselApi;
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
};

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

const useCarousel = function useCarousel() {
  const value = React.useContext(CarouselContext);

  if (!value) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }

  return value;
};

const Carousel = ({
  orientation = "horizontal",
  opts,
  plugins,
  setApi,
  scale = 2,
  className,
  style,
  onKeyDownCapture,
  children,
  ...props
}: React.ComponentProps<"div"> & CarouselProps) => {
  const [carouselRef, api] = useEmblaCarousel(
    { ...opts, axis: orientation === "horizontal" ? "x" : "y" },
    plugins
  );

  const [canScrollPrev, setPrev] = React.useState(false);
  const [canScrollNext, setNext] = React.useState(false);

  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const scrollNext = React.useCallback(() => {
    api?.scrollNext();
  }, [api]);

  React.useEffect(() => {
    if (api) {
      setApi?.(api);
    }
  }, [api, setApi]);
  React.useEffect(() => {
    if (!api) {
      return;
    }

    const update = () => {
      setPrev(api.canScrollPrev());
      setNext(api.canScrollNext());
    };

    update();
    api.on("select", update).on("reInit", update);

    return () => {
      api.off("select", update).off("reInit", update);
    };
  }, [api]);

  return (
    <CarouselContext.Provider
      value={{
        api,
        canScrollNext,
        canScrollPrev,
        carouselRef,
        opts,
        orientation,
        plugins,
        scale,
        scrollNext,
        scrollPrev,
      }}
    >
      <div
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Preserve shadcn Carousel's div region and div props/ref contract.
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        data-orientation={orientation}
        className={cn(`mc-carousel`, className)}
        style={minecraftStyle(style, (__style): CarouselScaleStyle => ({
          "--mc-scale": scale,
          ...__style,
        }))}
        {...props}
        onKeyDownCapture={(event) => {
          onKeyDownCapture?.(event);

          if (
            event.defaultPrevented ||
            (event.target as HTMLElement).closest(
              "input,textarea,select,[contenteditable=true]"
            )
          ) {
            return;
          }

          const prev =
            orientation === "vertical"
              ? "ArrowUp"
              : opts?.direction === "rtl"
                ? "ArrowRight"
                : "ArrowLeft";

          const next =
            orientation === "vertical"
              ? "ArrowDown"
              : opts?.direction === "rtl"
                ? "ArrowLeft"
                : "ArrowRight";

          if (event.key === prev) {
            event.preventDefault();
            scrollPrev();
          } else if (event.key === next) {
            event.preventDefault();
            scrollNext();
          }
        }}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
};

const CarouselContent = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  const { carouselRef } = useCarousel();

  return (
    <div
      data-slot="carousel-content"
      className="mc-carousel-viewport"
      ref={carouselRef}
    >
      <div
        data-slot="carousel-track"
        className={cn(`mc-carousel-track`, className)}
        {...props}
      />
    </div>
  );
};

const CarouselItem = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Preserve shadcn CarouselItem's div slide grouping contract.
    role="group"
    aria-roledescription="slide"
    data-slot="carousel-item"
    className={cn(`mc-carousel-item`, className)}
    {...props}
  />
);

type CarouselArrowProps = React.ComponentProps<"button"> & {
  scale?: 1 | 2 | 3;
  variant?: "default";
  size?: "default";
};

const CarouselArrow = ({
  direction,
  scale: ownScale,
  variant = "default",
  size = "default",
  className,
  style,
  disabled,
  onClick,
  ...props
}: CarouselArrowProps & {
  direction: "backward" | "forward";
}) => {
  const context = useCarousel();
  const forward = direction === "forward";

  const inactive =
    disabled ?? !(forward ? context.canScrollNext : context.canScrollPrev);

  if (variant !== "default" || size !== "default") {
    throw new Error(
      "Minecraft Carousel arrows support only the original default appearance"
    );
  }

  return (
    <button
      type="button"
      aria-label={forward ? "Next slide" : "Previous slide"}
      data-slot={forward ? "carousel-next" : "carousel-previous"}
      data-direction={direction}
      aria-disabled={inactive || undefined}
      disabled={inactive}
      className={cn(`mc-pagination-arrow mc-carousel-arrow`, className)}
      style={minecraftStyle(style, (__style): CarouselScaleStyle => ({
        "--mc-scale": ownScale ?? context.scale,
        ...__style,
      }))}
      {...props}
      onClick={(event) => {
        if (inactive) {
          event.preventDefault();

          return;
        }

        onClick?.(event);

        if (!event.defaultPrevented) {
          forward ? context.scrollNext() : context.scrollPrev();
          playMinecraftClick();
        }
      }}
    />
  );
};

const CarouselPrevious = (props: CarouselArrowProps) => (
  <CarouselArrow direction="backward" {...props} />
);

const CarouselNext = (props: CarouselArrowProps) => (
  <CarouselArrow direction="forward" {...props} />
);

export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  useCarousel,
};

export type {
  CarouselApi,
  CarouselProps,
  CarouselOptions,
  CarouselPlugin,
  CarouselArrowProps,
};
