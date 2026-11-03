"use client";

import { Separator } from "@/components/ui/separator";

const SeparatorExample = () => (
  <div className="grid [width:400px] max-w-full gap-8">
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
