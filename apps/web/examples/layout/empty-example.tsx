"use client";

import { Empty } from "@/components/ui/empty";

const EmptyExample = () => (
  <Empty /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
    style={{ height: 82, maxWidth: "100%", width: 400 }}
    /* eslint-enable shadcn/no-inline-styles */
  >
    No worlds found
  </Empty>
);

export default EmptyExample;
