import { afterEach, test } from "bun:test";
import assert from "node:assert/strict";

import {
  formatStarCount,
  loadStarCount,
} from "../../../../apps/web/lib/github-stars";

test("star counts are exact below 1000 and rounded to thousands from 1000", () => {
  assert.deepEqual([0, 999, 1000, 1499, 1500, 12_345].map(formatStarCount), [
    "0",
    "999",
    "1k",
    "1k",
    "2k",
    "12k",
  ]);
});

interface RecordedRequest {
  headers: Headers;
  init: RequestInit & { next?: { revalidate?: number } };
  url: string;
}

const realFetch = globalThis.fetch;
const realToken = process.env.GITHUB_TOKEN;

const setToken = (token: string | undefined) => {
  if (token === undefined) {
    delete process.env.GITHUB_TOKEN;
  } else {
    process.env.GITHUB_TOKEN = token;
  }
};

afterEach(() => {
  globalThis.fetch = realFetch;
  setToken(realToken);
});

// The GitHub repository API is the network boundary: replace fetch with a
// responder and record each request it receives.
const respondWith = (
  respond: (init: RequestInit) => Response | Promise<Response>
): RecordedRequest[] => {
  const requests: RecordedRequest[] = [];

  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      requests.push({
        headers: new Headers(init.headers),
        init,
        url: input instanceof Request ? input.url : input.toString(),
      });

      return await respond(init);
    },
    { preconnect: realFetch.preconnect }
  );

  return requests;
};

/** Repository API bodies, including malformed ones. */
type RepositoryBody =
  | Readonly<Record<string, string | number | null | undefined>>
  | readonly never[];

const repository = (body: RepositoryBody, status = 200) =>
  Response.json(body, { status });

test("an ok repository response yields its formatted star count, revalidated hourly", async () => {
  setToken(undefined);

  const requests = respondWith(() =>
    repository({ full_name: "nicognaW/grasscn", stargazers_count: 12_345 })
  );

  assert.equal(await loadStarCount(), "12k");
  assert.equal(requests.length, 1);
  assert.equal(
    requests[0]?.url,
    "https://api.github.com/repos/nicognaW/grasscn"
  );
  assert.equal(requests[0]?.init.next?.revalidate, 3600);
});

test("a non-ok repository response yields no count", async () => {
  respondWith(() =>
    repository({ message: "API rate limit exceeded", stargazers_count: 7 }, 403)
  );

  assert.equal(await loadStarCount(), undefined);
});

test("a repository body without a numeric star count yields no count", async () => {
  for (const body of [
    { stargazers_count: "12345" },
    { stargazers_count: null },
    // The Redstone Lamp display has no glyphs for "-", "." or "e".
    { stargazers_count: -1 },
    { stargazers_count: 1.5 },
    { stargazers_count: 1e21 },
    {},
    [],
  ]) {
    respondWith(() => repository(body));
    // oxlint-disable-next-line no-await-in-loop -- each body replaces the one responder in turn.
    assert.equal(await loadStarCount(), undefined, JSON.stringify(body));
  }

  respondWith(() => new Response("<html>unicorn</html>"));
  assert.equal(await loadStarCount(), undefined);
});

test("a repository API that does not answer within 3 s yields no count", async () => {
  // Like a real fetch, the stalled request settles only when its signal aborts.
  respondWith(async ({ signal }) => {
    const stalled = Promise.withResolvers<Response>();

    signal?.addEventListener("abort", () => {
      stalled.reject(new Error("aborted", { cause: signal.reason }));
    });

    return await stalled.promise;
  });

  const started = performance.now();

  assert.equal(await loadStarCount(), undefined);
  const elapsed = performance.now() - started;

  assert.ok(elapsed >= 2900 && elapsed < 4000, `settled after ${elapsed} ms`);
}, 10_000);

test("a set GITHUB_TOKEN is sent as a bearer token", async () => {
  setToken("ghp_example");
  const requests = respondWith(() => repository({ stargazers_count: 3 }));

  assert.equal(await loadStarCount(), "3");
  assert.equal(requests[0]?.headers.get("authorization"), "Bearer ghp_example");
});

test("without GITHUB_TOKEN no authorization is sent", async () => {
  for (const token of [undefined, ""]) {
    setToken(token);
    const requests = respondWith(() => repository({ stargazers_count: 3 }));

    // oxlint-disable-next-line no-await-in-loop -- each case replaces the one responder in turn.
    assert.equal(await loadStarCount(), "3");
    assert.equal(requests[0]?.headers.has("authorization"), false);
  }
});
