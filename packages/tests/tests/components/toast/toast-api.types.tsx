import { Toaster, toast as sonner } from "@grasscn/web/ui/sonner";
import * as React from "react";

const host = React.createRef<HTMLElement>();

sonner("Saved", {
  action: {
    label: "Undo",
    onClick: () => {
      /* empty */
    },
  },
  description: "Hello",
});

sonner.success("Success");

sonner.promise(Promise.resolve(1), {
  error: "Failed",
  loading: "Loading",
  success: String,
});

const toaster = (
  <Toaster
    ref={host}
    scale={1}
    position="top-right"
    gap={4}
    duration={5000}
    richColors={false}
    expand={true}
  />
);

// @ts-expect-error Minecraft notifications use their native palette.
const richColors = <Toaster richColors />;

// @ts-expect-error Minecraft notifications have no collapsed stack appearance.
const collapsed = <Toaster expand={false} />;

void [toaster, richColors, collapsed];
