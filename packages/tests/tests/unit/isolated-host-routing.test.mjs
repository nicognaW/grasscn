import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  isolatedHttpTarget,
  isolatedTunnelTarget,
} from "@grasscn/tests/isolated-host-routing";

const execution = { fixturePort: 5394, previewPort: 5396, proxyPort: 5397 };

test("isolated host routing preserves the snapshot and rejects arbitrary HTTP and CONNECT destinations", () => {
  assert.equal(
    isolatedHttpTarget(
      "http://127.0.0.1:5176/docs/components/button",
      "localhost:5176",
      execution
    ).href,
    "http://127.0.0.1:5396/docs/components/button"
  );
  assert.equal(isolatedTunnelTarget("localhost:5178", execution), 5394);
  assert.equal(isolatedTunnelTarget("127.0.0.1:5173", execution), 5397);

  for (const target of [
    "http://example.com:5176/",
    "https://127.0.0.1:5176/",
    "http://127.0.0.1:5300/",
  ]) {
    assert.throws(
      () => isolatedHttpTarget(target, "localhost:5176", execution),
      /owned/i
    );
  }
  for (const target of [
    "example.com:5176",
    "127.0.0.1:5300",
    "localhost:5176/private",
    "user@localhost:5176",
  ]) {
    assert.throws(() => isolatedTunnelTarget(target, execution), /owned/i);
  }
});
