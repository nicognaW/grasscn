import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { exampleInstallation } from "../lib/example-installation";
import { installationManifest } from "../lib/installation";

test("copied Tabs example declares independently distributed composition items", () => {
  expect(
    exampleInstallation(`
    import { Tabs } from "@/components/ui/tabs";
    import { Button } from "@/components/ui/button";
    import { Typography } from "@/components/ui/typography";
  `)
  ).toEqual(["button", "tabs", "typography"]);
});

test("grouped example parts point to their installable owners", () => {
  expect(
    exampleInstallation(`
    import { Field } from "@/components/ui/field";
    import { Bubble } from "@/components/ui/bubble";
    import { MessageScroller } from "@/components/ui/message-scroller";
  `)
  ).toEqual(["form", "message"]);
});

test("every maintained executable example has distributed prerequisites", async () => {
  const directory = path.resolve(import.meta.dir, "../examples");
  const files = [...new Bun.Glob("**/*.tsx").scanSync(directory)];
  expect(files).toContain(path.join("layout", "tabs-example.tsx"));
  await Promise.all(
    files.map(async (file) => {
      const code = await readFile(path.join(directory, file), "utf-8");
      expect(exampleInstallation(code).length).toBeGreaterThan(0);
    })
  );
});

test("manual installation keeps runtime packages and development types separate", async () => {
  const button = await installationManifest("button");
  const avatar = await installationManifest("avatar");

  expect(button?.dependencies).toEqual([
    "class-variance-authority",
    "@base-ui/react",
    "react-is",
  ]);
  expect(button?.devDependencies).toEqual(["@types/react-is"]);
  expect(avatar?.devDependencies).toEqual([]);
});
