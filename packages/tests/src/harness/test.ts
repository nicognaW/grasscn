import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

import { parseWebsiteIdentity } from "@grasscn/tests/verification-types";
import { test as base } from "@playwright/test";
import { PNG } from "pngjs";

export * from "@playwright/test";

type CollectedMetric =
  | { data: unknown; file: string }
  | { file: string; unreadable: true };

const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

export const test = base.extend<{ grasscnVerificationArtifacts: void }>({
  grasscnVerificationArtifacts: [
    async ({ page }, use, info) => {
      await use();

      const files = existsSync(info.outputDir)
        ? readdirSync(info.outputDir)
        : [];

      const artifacts = files.flatMap((file) => {
        if (!/actual.*\.png$/i.test(file)) {
          return [];
        }

        const bytes = readFileSync(path.join(info.outputDir, file));
        const png = PNG.sync.read(bytes);

        return [
          {
            decodedRgbaSha256: digest(png.data),
            file,
            height: png.height,
            pngSha256: digest(bytes),
            width: png.width,
          },
        ];
      });

      const metrics = files.flatMap((file): CollectedMetric[] => {
        if (!/\.[jJ][sS][oO][nN]$/u.test(file)) {
          return [];
        }

        try {
          return [
            {
              data: JSON.parse(
                readFileSync(path.join(info.outputDir, file), "utf-8")
              ),
              file,
            },
          ];
        } catch {
          return [{ file, unreadable: true }];
        }
      });

      let renderedUrl: string | undefined;
      let subjectElement: string | undefined;
      let subjectSlot: string | null | undefined;

      if (!page.isClosed()) {
        renderedUrl = page.url();
        const subject = page.locator("[data-subject]");

        const subjectSnapshot = await subject.evaluateAll((elements) =>
          elements.length === 1
            ? {
                dataSlot: elements[0].dataset.slot ?? null,
                tagName: elements[0].tagName,
              }
            : undefined
        );

        subjectSlot = subjectSnapshot?.dataSlot;
        subjectElement = subjectSnapshot?.tagName;
      }

      await info.attach("grasscn-verification-artifacts", {
        body: Buffer.from(
          JSON.stringify({
            artifacts,
            bundleSha256: process.env.GRASSCN_INSTALLED_BUNDLE_SHA256,
            fixtureUrl: process.env.GRASSCN_FIXTURE_URL,
            metrics,
            outputDirectory: info.outputDir,
            previewUrl: process.env.GRASSCN_PREVIEW_URL,
            renderedUrl,
            subjectElement,
            subjectSlot,
            testId: info.testId,
            titlePath: info.titlePath,
            websiteIdentity:
              process.env.GRASSCN_WEBSITE_IDENTITY === undefined
                ? null
                : parseWebsiteIdentity(process.env.GRASSCN_WEBSITE_IDENTITY),
          })
        ),
        contentType: "application/json",
      });
    },
    { auto: true },
  ],
});
