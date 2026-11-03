import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@grasscn/web/ui/carousel";
import type { CarouselApi } from "@grasscn/web/ui/carousel";
import * as React from "react";

const p = new URLSearchParams(location.search);

// SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
const scale = Number(p.get("scale") ?? 2) as 1 | 2 | 3;
const vertical = p.has("vertical");
const cancel = p.has("cancel");

export const CarouselFixture = () => {
  React.useLayoutEffect(() => {
    const bg = p.get("background") ?? "#202020";
    const html = document.documentElement.style.background;
    const body = document.body.style.background;

    document.documentElement.style.background = bg;
    document.body.style.background = bg;

    return () => {
      document.documentElement.style.background = html;
      document.body.style.background = body;
    };
  }, []);

  const [api, setApi] = React.useState<CarouselApi>();
  const [index, setIndex] = React.useState(0);
  const [events, setEvents] = React.useState(0);
  const [count, setCount] = React.useState(3);

  React.useEffect((): ReturnType<React.EffectCallback> => {
    if (!api) {
      return;
    }

    const update = () => {
      setIndex(api.selectedScrollSnap());
    };

    update();
    api.on("select", update).on("reInit", update);

    return () => {
      api.off("select", update).off("reInit", update);
    };
  }, [api]);

  const backward = p.get("direction") === "backward";
  const Arrow = backward ? CarouselPrevious : CarouselNext;

  if (p.has("native")) {
    return (
      <Carousel
        scale={scale}
        className="fixture-placement-fixed fixture-geometry-x fixture-geometry-y fixture-geometry-width fixture-geometry-height"
        style={{
          "--fixture-height": `${17 * scale}px`,
          "--fixture-width": `${12 * scale}px`,
          "--fixture-x": `${Number(p.get("x") ?? 16) * scale}px`,
          "--fixture-y": `${Number(p.get("y") ?? 16) * scale}px`,
        }}
      >
        <Arrow
          id="subject"
          disabled={(p.get("state") ?? "").startsWith("disabled")}
          className="fixture-placement-static fixture-carousel-untransformed"
          data-subject="true"
        />
      </Carousel>
    );
  }

  return (
    <>
      <Carousel
        aria-label="Saved worlds"
        setApi={setApi}
        scale={scale}
        orientation={vertical ? "vertical" : "horizontal"}
        opts={{
          direction: p.has("rtl") ? "rtl" : "ltr",
          duration: 0,
          loop: p.has("loop"),
        }}
        dir={p.has("rtl") ? "rtl" : undefined}
        className={
          vertical
            ? "fixture-width-300 fixture-height-180"
            : "fixture-width-300"
        }
        onKeyDownCapture={(event) => {
          if (p.has("cancelKeys")) {
            event.preventDefault();
          }
        }}
      >
        <CarouselContent>
          {Array.from({ length: count }, (_, i) => (
            <CarouselItem
              key={i}
              className={`fixture-height-180 fixture-owner-layout-1 fixture-owner-layout-42 ${["fixture-carousel-slide-a", "fixture-carousel-slide-b", "fixture-carousel-slide-c"][i % 3] ?? ""}`}
            >
              <span>World {i + 1}</span>
              <input aria-label={`World ${i + 1} name`} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          id="previous"
          onClick={(event) => {
            setEvents((v) => v + 1);

            if (cancel) {
              event.preventDefault();
            }
          }}
        />
        <CarouselNext
          id="next"
          onClick={(event) => {
            setEvents((v) => v + 1);

            if (cancel) {
              event.preventDefault();
            }
          }}
        />
      </Carousel>
      <button type="button" id="api" onClick={() => api?.scrollTo(2, true)}>
        API scroll
      </button>
      <button
        type="button"
        id="add"
        onClick={() => {
          setCount((v) => v + 1);
        }}
      >
        Add slide
      </button>
      <button type="button" id="reinit" onClick={() => api?.reInit()}>
        Reinit
      </button>
      <output id="index">{index}</output>
      <output id="events">{events}</output>
    </>
  );
};
