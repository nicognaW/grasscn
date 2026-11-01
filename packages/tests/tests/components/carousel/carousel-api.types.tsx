import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
  type CarouselOptions,
  type CarouselPlugin,
} from "@grasscn/web/ui/carousel";
import * as React from "react";
const ref = React.createRef<HTMLDivElement>();
const opts: CarouselOptions = { loop: true, align: "start", direction: "rtl" };
const plugins: CarouselPlugin = [];
export const api = (
  <Carousel
    ref={ref}
    orientation="vertical"
    scale={3}
    opts={opts}
    plugins={plugins}
    setApi={(api: CarouselApi) => api?.scrollTo(1, true)}
    onKeyDownCapture={(e) => e.currentTarget.focus()}
  >
    <CarouselContent ref={React.createRef<HTMLDivElement>()}>
      <CarouselItem ref={React.createRef<HTMLDivElement>()}>World</CarouselItem>
    </CarouselContent>
    <CarouselPrevious
      ref={React.createRef<HTMLButtonElement>()}
      disabled={false}
      variant="default"
      size="default"
    />
    <CarouselNext onClick={(e) => e.preventDefault()} />
  </Carousel>
);
