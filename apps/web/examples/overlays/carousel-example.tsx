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
  <div className="[width:100%] max-w-125 p-12">
    <Carousel aria-label="World gallery">
      <CarouselContent>
        {["Grasslands", "Deep Dark", "Birch Forest"].map((name) => (
          <CarouselItem key={name}>
            <Card className="min-h-40">
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
