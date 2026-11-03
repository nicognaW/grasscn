import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { webRoot } from "@grasscn/tests/paths";

/** @typedef {{name: string, files?: {path: string}[]}} DocumentationRegistryItem */
/** @typedef {{name: string, playground: boolean, registryItem: string, route: string, title: string}} DocumentationPage */

/**
 * @param {unknown} value - Raw metadata field.
 * @returns {value is string} Whether the field is text.
 */
// eslint-disable-next-line anti-slop/no-runtime-typeof -- String fields are validated at the authored metadata boundary.
const isString = (value) => typeof value === "string";

/**
 * @param {unknown} value - Raw authored JSON.
 * @returns {value is Record<string, unknown>} Whether metadata is an object.
 */
const isRecord = (value) =>
  value !== null && value instanceof Object && !Array.isArray(value);

/**
 * @param {unknown} value - Raw registry file.
 * @returns {value is {path: string}} Whether a source path is present.
 */
const isFile = (value) => isRecord(value) && isString(value.path);

/**
 * @param {unknown} value - Raw authored registry item.
 * @returns {value is DocumentationRegistryItem} Whether consumed item fields are valid.
 */
const isItem = (value) =>
  isRecord(value) &&
  isString(value.name) &&
  (value.files === undefined ||
    (Array.isArray(value.files) && value.files.every(isFile)));

/**
 * @param {string} [root] - Authored web workspace.
 * @returns {DocumentationRegistryItem[]} Authored registry entries.
 */
export const documentationRegistry = (root = webRoot) => {
  /** @type {unknown} */
  const value = JSON.parse(
    readFileSync(path.join(root, "registry.json"), "utf-8")
  );

  assert.ok(
    isRecord(value) && Array.isArray(value.items) && value.items.every(isItem),
    "Authored documentation registry metadata required"
  );

  return value.items;
};

/**
 * @param {string} root - Authored web workspace.
 * @returns {Map<string, string[]>} Item aliases grouped by their registry owner.
 */
const documentationGroups = (root) => {
  /** @type {unknown} */
  const value = JSON.parse(
    readFileSync(path.join(root, "component-groups.json"), "utf-8")
  );

  assert.ok(isRecord(value), "Authored component groups required");
  /** @type {Map<string, string[]>} */
  const groups = new Map();

  for (const [owner, names] of Object.entries(value)) {
    assert.ok(
      Array.isArray(names) && names.every(isString),
      `${owner}: component group names required`
    );
    groups.set(owner, names);
  }

  return groups;
};

const titlePattern = /^title:\s*(?<title>.+)$/mu;
const quotesPattern = /^['"]|['"]$/gu;
const playgroundPattern = /<\w*Playground\b/u;

// Test selection metadata only. Fumadocs remains the sole documentation renderer,
// page-tree, heading and search owner; no body or navigation is generated here.
/**
 * @param {string} [root] - Authored web workspace.
 */
export const documentationInventory = (root = webRoot) => {
  const registry = documentationRegistry(root);
  const groups = documentationGroups(root);
  /** @type {Map<string, string>} */
  const owners = new Map();

  for (const item of registry) {
    owners.set(item.name, item.name);
  }

  for (const [owner, names] of groups) {
    for (const name of names) {
      owners.set(name, owner);
    }
  }

  const directory = path.join(root, "content/docs/components");

  const sortedPageFiles = readdirSync(directory).filter((file) =>
    file.endsWith(".mdx")
  );

  sortedPageFiles.sort();

  const pages = sortedPageFiles.map((file) => {
    const name = file.slice(0, -4);
    const text = readFileSync(path.join(directory, file), "utf-8");

    const title = titlePattern
      .exec(text)
      ?.groups?.title?.replaceAll(quotesPattern, "");

    if (title === undefined || title.length === 0) {
      throw new Error(`${name}: authored canonical page has no title`);
    }

    const registryItem = owners.get(name);

    if (registryItem === undefined) {
      throw new Error(`${name}: canonical page has no registry owner`);
    }

    return {
      name,
      playground: playgroundPattern.test(text),
      registryItem,
      route: `/docs/components/${name}`,
      title,
    };
  });

  const pageNames = new Set(pages.map((page) => page.name));

  for (const name of owners.keys()) {
    if (!pageNames.has(name)) {
      throw new Error(`${name}: missing canonical documentation page`);
    }
  }

  const sortedItemNames = registry.map((item) => item.name);
  sortedItemNames.sort();

  return {
    items: sortedItemNames,
    pages,
    playgrounds: pages.filter((page) => page.playground),
  };
};
