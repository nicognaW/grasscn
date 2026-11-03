"use client";

import { Separator } from "@/components/ui/separator";

const SeparatorExample = () => (
  <div /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
    className="grid [width:400px] gap-8"
    style={{ maxWidth: "100%" }}
    /* eslint-enable shadcn/no-inline-styles */
  >
    <Separator
      /* eslint-disable jsx-a11y/prefer-tag-over-role -- Keep the native component tag, CSS geometry and explicit composed ARIA role together. */
      role="separator"
      /* eslint-enable jsx-a11y/prefer-tag-over-role */
      aria-label="Menu header separator"
    />
    <Separator
      edge="footer"

      /* eslint-disable jsx-a11y/prefer-tag-over-role -- Keep the native component tag, CSS geometry and explicit composed ARIA role together. */
      role="separator"
      /* eslint-enable jsx-a11y/prefer-tag-over-role */

      aria-label="Menu footer separator"
    />
  </div>
);

export default SeparatorExample;
