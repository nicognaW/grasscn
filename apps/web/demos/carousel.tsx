import type { DemoVariables } from "../demo-variables";
import * as React from "react"
import{Carousel,CarouselContent,CarouselItem,CarouselPrevious,CarouselNext,type CarouselApi}from"../registry/ui/carousel"
import{Card,CardHeader,CardTitle,CardContent}from"../registry/ui/card"
import{Button}from"../registry/ui/button"
import type{DemoProps}from"../types"
export default function CarouselDemo({ scale }: DemoProps) {
  const [api, setApi] = React.useState<CarouselApi>(),
    [selected, setSelected] = React.useState(0),
    [vertical, setVertical] = React.useState(false);
  React.useEffect(() => {
    if (!api) return;
    const update = () => setSelected(api.selectedScrollSnap());
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
          onClick={() => setVertical((v) => !v)}
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
                  style={{ width: "100%", height: "100%", padding: 8 * scale }}
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
        <span className="status-dot" />
        <output aria-label="Current slide">World {selected + 1} / 3</output>
        <span>Drag or use arrow keys.</span>
      </div>
    </>
  );
}
