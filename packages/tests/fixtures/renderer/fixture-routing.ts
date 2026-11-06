import type { ComponentType } from "react";

interface FixtureViews {
  fixture: ComponentType;
  nativeFixture?: ComponentType;
}

export type FixtureRoute = FixtureViews &
  (
    | { kind: "name"; name: string }
    | { kind: "aliases"; names: readonly string[] }
    | { kind: "prefix"; prefix: string }
  );

const matchesFixtureRoute = (query: URLSearchParams, route: FixtureRoute) => {
  if (route.kind === "name") {
    return query.get("component") === route.name;
  }

  if (route.kind === "aliases") {
    return route.names.includes(query.get("component") ?? "");
  }

  return query.get("component")?.startsWith(route.prefix) === true;
};

/** Ordered fixture routes retain exact-name priority over later prefix families. */
export const resolveFixtureRoute = (
  query: URLSearchParams,
  routes: readonly FixtureRoute[],
  fallback: ComponentType
): ComponentType => {
  for (const route of routes) {
    if (matchesFixtureRoute(query, route)) {
      const { nativeFixture } = route;

      return nativeFixture !== undefined && query.has("native")
        ? nativeFixture
        : route.fixture;
    }
  }

  return fallback;
};
