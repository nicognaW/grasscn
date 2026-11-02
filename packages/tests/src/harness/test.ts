import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

import { parseWebsiteIdentity } from "@grasscn/tests/verification-types";
import { test as base } from "@playwright/test";
import { PNG } from "pngjs";

export * from "@playwright/test";

const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

export const test = base.extend<{ grasscnVerificationArtifacts: void }>({
  grasscnVerificationArtifacts: [
    async ({ page }, use, info) => {
      await use();

      const files = existsSync(info.outputDir)
        ? readdirSync(info.outputDir)
        : [];

      const artifacts = files
        .filter((file) => /actual.*\.png$/i.test(file))
        .map((file) => {
          const bytes = readFileSync(path.join(info.outputDir, file));
          const png = PNG.sync.read(bytes);

          return {
            decodedRgbaSha256: digest(png.data),
            file,
            height: png.height,
            pngSha256: digest(bytes),
            width: png.width,
          };
        });

      const metrics = files
        .filter((file) => /\.[jJ][sS][oO][nN]$/u.test(file))
        .map((file) => {
          try {
            return {
              data: JSON.parse(
                readFileSync(path.join(info.outputDir, file), "utf-8")
              ),
              file,
            };
          } catch {
            return { file, unreadable: true };
          }
        });

      let renderedUrl: string | undefined;
      let subjectElement: string | undefined;
      let subjectSlot: string | null | undefined;

      if (!page.isClosed()) {
        renderedUrl = page.url();
        const subject = page.locator("[data-subject]");

        if ((await subject.count()) === 1) {
          subjectSlot = await subject.getAttribute("data-slot");
          subjectElement = await subject.evaluate((element) => element.tagName);
        }
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
