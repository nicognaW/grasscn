"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

export default function Example() {
  return (
    <div style={{ padding: 48, width: "100%", maxWidth: 500 }}>
      <Carousel aria-label="World gallery">
        <CarouselContent>
          {["Grasslands", "Deep Dark", "Birch Forest"].map((name) => (
            <CarouselItem key={name}>
              <Card style={{ minHeight: 160 }}>
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
}
