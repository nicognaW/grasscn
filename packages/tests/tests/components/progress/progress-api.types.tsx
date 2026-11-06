import { Progress } from "@grasscn/web/ui/progress";

// @ts-expect-error Only original Minecraft boss-bar colors are available.
const inventedColor = <Progress color="destructive" />;

// @ts-expect-error Only original Minecraft notch styles are available.
const inventedOverlay = <Progress overlay="striped" />;

export const ProgressApiContract = function ProgressApiContract() {
  const supported = (
    <Progress
      color="purple"
      overlay="notched_10"
      value={125}
      max={250}
      scale={3}
    />
  );

  const composed = (
    <Progress render={<section />} value={null}>
      {undefined}
    </Progress>
  );

  return [supported, composed, inventedColor, inventedOverlay];
};
