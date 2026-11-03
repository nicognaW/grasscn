"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

const Example = () => (
  <div /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
    className="[padding:48px] [width:100%]"
    style={{ maxWidth: 500 }}
    /* eslint-enable shadcn/no-inline-styles */
  >
    <Carousel aria-label="World gallery">
      <CarouselContent>
        {["Grasslands", "Deep Dark", "Birch Forest"].map((name) => (
          <CarouselItem key={name}>
            <Card /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
              style={{ minHeight: 160 }}
              /* eslint-enable shadcn/no-inline-styles */
            >
              <CardHeader>
                <CardTitle>{name}</CardTitle>
              </CardHeader>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  </div>
);

export default Example;
