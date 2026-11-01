import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  parseProductionIdentity,
  parseWebsiteIdentity,
  verificationWebsite,
} from "@grasscn/tests/verification-types";

test("browser artifact identity accepts the public host summary without weakening full build receipts", () => {
  const summary = {
    buildId: "build",
    outputSha256: "output",
    source: { commit: "commit", status: "", treeSha256: "tree" },
  };

  assert.deepEqual(verificationWebsite(summary), summary);
  assert.deepEqual(parseWebsiteIdentity(JSON.stringify(summary)), summary);
  assert.throws(() => parseWebsiteIdentity("not-json"), SyntaxError);
  assert.throws(
    () => parseWebsiteIdentity(JSON.stringify({ buildId: "build" })),
    /Owned verification website identity required/u
  );
  assert.throws(
    () => parseProductionIdentity(JSON.stringify(summary)),
    /Complete production source\/output receipt required/u
  );
});
