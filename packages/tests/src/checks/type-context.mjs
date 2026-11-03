import { fixtureFile } from "@grasscn/tests/paths";

/** @type {string} */
export const bunRuntimeVersion = Bun.version;

/** @type {string} */
export const rendererEntryPath = fixtureFile("index.html");

const contextValues = [2, 1];

contextValues.sort((first, second) => first - second);

/** @type {number[]} */
export const sortedContextValues = contextValues;
