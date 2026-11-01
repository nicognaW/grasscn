import {
  defineConfig,
  defineDocs,
  frontmatterSchema,
} from "fumadocs-mdx/config";
import { z } from "zod";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: frontmatterSchema.extend({
      aliases: z.array(z.string()).default([]),
      exports: z.array(z.string()).default([]),
    }),
  },
});
export default defineConfig();
