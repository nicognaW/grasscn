import { fixtureFile } from "@grasscn/tests/paths";

/** @type {string} */
export const bunRuntimeVersion = Bun.version;

/** @type {string} */
export const rendererEntryPath = fixtureFile("index.html");

/** @type {number[]} */
export const sortedContextValues = [2, 1].toSorted(
  (first, second) => first - second
);
