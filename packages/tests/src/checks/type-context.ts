import { fixtureFile } from "@grasscn/tests/paths";

/** @type {string} */
export const bunRuntimeVersion: string = Bun.version;

/** @type {string} */
export const rendererEntryPath: string = fixtureFile("index.html");

const contextValues = [2, 1];

contextValues.sort((first, second) => first - second);

/** @type {number[]} */
export const sortedContextValues: number[] = contextValues;
