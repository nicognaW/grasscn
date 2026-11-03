import type { DemoVariables } from "../demo-variables";
import type { CarouselApi } from "../registry/ui/carousel";
import type { DemoProps } from "../types";
import type { CSSProperties as IntrinsicLayoutCSSProperties } from "react";

import * as React from "react";

import { Button } from "../registry/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../registry/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "../registry/ui/carousel";

interface IntrinsicLayoutStyle1 extends IntrinsicLayoutCSSProperties {
  "--mc-intrinsic-demos-carousel-1-padding": `${number}px`;
}

const CarouselDemo = ({ scale }: DemoProps) => {
  const [api, setApi] = React.useState<CarouselApi>();
  const [selected, setSelected] = React.useState(0);
  const [vertical, setVertical] = React.useState(false);

  React.useEffect(() => {
    if (!api) {
      return;
    }

    const update = () => {
      setSelected(api.selectedScrollSnap());
    };

    update();
    api.on("select", update);

    return () => {
      api.off("select", update);
    };
  }, [api]);

  return (
    <>
      <div className="demo-options">
        <Button
          scale={scale}
          type="button"
          className="w-(--demo-width)"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${120 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
          onClick={() => {
            setVertical((v) => !v);
          }}
        >
          Change direction
        </Button>
      </div>
      <div
        className="demo-stage"
        data-stage="carousel"
        style={
          /* SAFETY: satisfies checks --demo-stage-padding against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
          {
            "--demo-stage-padding": `${24 * scale}px`,
          } satisfies DemoVariables as DemoVariables
        }
      >
        <Carousel
          scale={scale}
          setApi={setApi}
          orientation={vertical ? "vertical" : "horizontal"}
          aria-label="World gallery"
          style={{
            width: Math.min(400, 200 * scale),
            height: vertical ? 120 * scale : undefined,
            maxWidth: "100%",
          }}
        >
          <CarouselContent>
            {["Grasslands", "你好，世界", "Deep Dark"].map((name, index) => (
              <CarouselItem key={name} style={{ height: 120 * scale }}>
                <Card
                  scale={scale}
                  className="h-full w-full p-(--mc-intrinsic-demos-carousel-1-padding)"
                  style={
                    // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
                    {
                      "--mc-intrinsic-demos-carousel-1-padding": `${8 * scale}px`,
                    } satisfies IntrinsicLayoutStyle1 as IntrinsicLayoutStyle1
                  }
                >
                  <CardHeader>
                    <CardTitle>{name}</CardTitle>
                  </CardHeader>
                  <CardContent>World {index + 1}</CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
      <div className="demo-result">
        <span />
        <output aria-label="Current slide">World {selected + 1} / 3</output>
        <span>Drag or use arrow keys.</span>
      </div>
    </>
  );
};

export { CarouselDemo as default };
