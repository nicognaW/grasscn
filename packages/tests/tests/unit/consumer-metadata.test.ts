import { expect, test } from "bun:test";

import {
  isInstalledMetadata,
  isPackageMetadata,
  isRegistryPayload,
} from "../../src/installed/consumer-metadata";

test("consumer metadata rejects malformed dependencies and installed versions", () => {
  expect(
    isPackageMetadata({ dependencies: { react: "19" }, devDependencies: {} })
  ).toBe(true);
  expect(isPackageMetadata({ dependencies: { react: 19 } })).toBe(false);
  expect(isPackageMetadata({ dependencies: [] })).toBe(false);
  expect(isInstalledMetadata({ name: "react", version: "19" })).toBe(true);
  expect(isInstalledMetadata({ name: "react", version: 19 })).toBe(false);
});

test("public registry metadata validates optional targets before path resolution", () => {
  expect(
    isRegistryPayload({
      files: [
        {
          path: "ui/button.tsx",
          target: "@ui/button.tsx",
          type: "registry:ui",
        },
      ],
      name: "button",
    })
  ).toBe(true);
  expect(
    isRegistryPayload({
      files: [{ path: "ui/button.tsx", target: 1 }],
      name: "button",
    })
  ).toBe(false);
  expect(isRegistryPayload({ files: [{ path: 1 }], name: "button" })).toBe(
    false
  );
});
