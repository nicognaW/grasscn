import { Separator } from "@grasscn/web/ui/separator";

// @ts-expect-error No native vertical separator is established.
const vertical = <Separator orientation="vertical" />;

// @ts-expect-error Only original header/footer surfaces are available.
const invented = <Separator edge="outline" />;

export const SeparatorApiContract = function SeparatorApiContract() {
  const supported = (
    <Separator
      orientation="horizontal"
      edge="footer"
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- This API case verifies the semantic role on Separator's default primitive, separately from the existing render-as-hr case.
      role="separator"
      scale={3}
      aria-label="Settings"
    />
  );

  const composed = <Separator render={<hr />}>{undefined}</Separator>;

  return [supported, composed, vertical, invented];
};
