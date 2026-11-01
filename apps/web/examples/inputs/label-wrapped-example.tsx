"use client";

import { Label } from "@/components/ui/label";

const VariantExample = () => (
  /* eslint-disable jsx-a11y/label-has-associated-control -- This declared native Label case demonstrates standalone wrapped text without a form control. */
  <Label maxWidth={150} align="center">
    Choose a name for your new world.
  </Label>
  /* eslint-enable jsx-a11y/label-has-associated-control */
);

export default VariantExample;
