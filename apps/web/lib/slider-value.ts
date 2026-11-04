import type { ComponentProps } from "react";

import type { Slider } from "../registry/ui/slider";

type SliderChangedValue = Parameters<
  NonNullable<ComponentProps<typeof Slider>["onValueChange"]>
>[0];

/** Classify Base UI Slider callback values without losing readonly numeric elements. */
export const isSliderValueList = (
  value: SliderChangedValue
): value is Exclude<SliderChangedValue, number> => Array.isArray(value);
