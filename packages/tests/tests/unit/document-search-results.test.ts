import { test, expect } from "bun:test";

import { componentSymbols } from "../../../../apps/web/lib/component-symbols";
import { groupSearchResults } from "../../../../apps/web/lib/search-results";

const pages = [
  {
    description: "Minecraft button.",
    terms: ["push button", ...componentSymbols.button.exports],
    title: "Button",
    url: "/docs/components/button",
  },
  {
    description: "Related actions.",
    terms: componentSymbols["button-group"].exports,
    title: "Button Group",
    url: "/docs/components/button-group",
  },
  {
    description: "Validation.",
    terms: componentSymbols.form.exports,
    title: "Form",
    url: "/docs/components/form",
  },
  {
    description: "Field labels and descriptions.",
    terms: componentSymbols.field.exports,
    title: "Field",
    url: "/docs/components/field",
  },
];

const hits: Parameters<typeof groupSearchResults>[0] = [
  {
    content: "Button Group",
    id: "group",
    type: "page",
    url: "/docs/components/button-group",
  },
  {
    content: "ButtonGroupSeparator",
    id: "group-export",
    type: "text",
    url: "/docs/components/button-group#usage",
  },
  {
    content: "Button",
    id: "button",
    type: "page",
    url: "/docs/components/button",
  },
  {
    content: "buttonVariants",
    id: "button-export",
    type: "text",
    url: "/docs/components/button#usage",
  },
  {
    content: "Compose a Form from FieldSet and FieldGroup.",
    id: "form",
    type: "text",
    url: "/docs/components/form#usage",
  },
  {
    content: "FieldSet",
    id: "field",
    type: "text",
    url: "/docs/components/field#usage",
  },
];

test("search presents each Fumadocs page once and ranks exact names, aliases and owned exports", () => {
  const result = groupSearchResults(hits, "button", pages);
  expect(result[0]).toMatchObject({
    title: "Button",
    url: "/docs/components/button",
  });
  expect(new Set(result.map((hit) => hit.id)).size).toBe(result.length);
  expect(groupSearchResults(hits, "push button", pages)[0].title).toBe(
    "Button"
  );
  expect(groupSearchResults(hits, "buttonVariants", pages)[0].title).toBe(
    "Button"
  );
  expect(groupSearchResults(hits, "FieldSet", pages)[0]).toMatchObject({
    title: "Field",
    url: "/docs/components/field",
  });
  expect(groupSearchResults(hits, "---", pages)).toEqual([]);
});

test("full-text and heading hits retain their section destination inside one page result", () => {
  const result = groupSearchResults(
    [
      {
        content: "Keyboard interaction",
        id: "keyboard",
        type: "heading",
        url: "/docs/components/button#keyboard",
      },
      {
        content: "Use the keyboard to focus and activate the native control.",
        id: "text",
        type: "text",
        url: "/docs/components/button#keyboard",
      },
    ],
    "keyboard",
    pages
  );

  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({
    snippet: "Use the keyboard to focus and activate the native control.",
    title: "Button",
    url: "/docs/components/button#keyboard",
  });
});
