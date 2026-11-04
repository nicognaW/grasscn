import { writeFileSync } from "node:fs";

import { test, expect } from "@grasscn/tests/test";

for (const scale of [1, 2, 3]) {
  for (const warm of [false, true]) {
    for (const variant of ["ascii", "cjk", "wrapped"]) {
      test(`Collapsible first paint ${variant} GUI${scale} ${warm ? "warm" : "cold"}`, async ({
        page,
      }, info) => {
        let selectedText:
          | "Hello Minecraft\n\nNext adventure"
          | "你好，世界\n\nHello Minecraft"
          | "你好，世界你好，世界你好，世界\nMinecraft adventures start here.";

        if (variant === "ascii") {
          selectedText = "Hello Minecraft\n\nNext adventure";
        } else if (variant === "cjk") {
          selectedText = "你好，世界\n\nHello Minecraft";
        } else {
          selectedText =
            "你好，世界你好，世界你好，世界\nMinecraft adventures start here.";
        }

        const text = selectedText;

        const frameQuery = new URLSearchParams({
          component: "collapsible-first-frame",
          scale: String(scale),
          text,
          width: variant === "wrapped" ? "80" : "200",
        });

        if (warm) {
          frameQuery.set("warm", "1");
        }

        await page.goto(`/?${frameQuery}`);
        await expect(page.locator("[data-warm-ready]")).toHaveAttribute(
          "data-warm-ready",
          "true"
        );

        // No text/font readiness wait occurs before clicking or sampling.
        const frames = await page.evaluate(async () => {
          const trigger = document.querySelector<HTMLButtonElement>(
            '[data-slot="collapsible-trigger"]'
          );

          if (trigger === null) {
            throw new Error("Missing required dom query: trigger");
          }

          const start = performance.now();

          trigger.click();
          const capturedFrames = [];

          for (const milestone of [0, 16, 32, 50, 100]) {
            const samplingCompletion = Promise.withResolvers();

            try {
              setTimeout(
                samplingCompletion.resolve,
                Math.max(0, milestone - (performance.now() - start))
              );
            } catch (error) {
              samplingCompletion.reject(error);
            }

            // oxlint-disable-next-line no-await-in-loop -- Samples one live animation at ordered milestones; each frame observation must follow its timer and precede the next sample.
            await samplingCompletion.promise;

            const content = document.querySelector<HTMLElement>(
              '[data-slot="collapsible-content"]'
            );

            if (content === null) {
              throw new Error("Missing required dom query: content");
            }

            const label = content.querySelector<HTMLElement>(
              "[data-mc-label-layout-ready]"
            );

            if (label === null) {
              throw new Error("Missing required dom query: label");
            }

            const rect = content.getBoundingClientRect();
            const style = getComputedStyle(content);

            const lines = Array.from(
              label.querySelectorAll<HTMLElement>(".mc-label-line")
            ).map((line) => ({
              text:
                line.querySelector(".mc-text-accessible")?.textContent ??
                line.textContent,
              height: line.getBoundingClientRect().height,
            }));

            capturedFrames.push({
              milestone,
              elapsed: performance.now() - start,
              height: rect.height,
              width: rect.width,
              ready: label.dataset.mcLabelLayoutReady,
              display: style.display,
              visibility: style.visibility,
              lines,
            });
          }

          return capturedFrames;
        });

        writeFileSync(
          info.outputPath("first-frames.json"),
          JSON.stringify({ text, scale, warm, frames }, null, 2)
        );
        await expect(
          page.locator("[data-mc-label-layout-ready]")
        ).toHaveAttribute("data-mc-label-layout-ready", "true");

        const finalLines = await page
          .locator(".mc-label-line")
          .evaluateAll((lines) =>
            lines.map(
              (line) =>
                line.querySelector(".mc-text-accessible")?.textContent ??
                line.textContent
            )
          );

        expect(finalLines.length).toBeGreaterThanOrEqual(
          variant === "wrapped" ? 4 : 3
        );

        if (variant !== "wrapped") {
          expect(finalLines).toEqual(text.split("\n"));
        }

        for (const frame of frames) {
          expect(frame.display).not.toBe("none");
          expect(frame.visibility).toBe("visible");
          expect(frame.lines.map((line) => line.text)).toEqual(finalLines);
          expect(frame.height).toBe((finalLines.length * 9 + 12) * scale);

          for (const line of frame.lines) {
            expect(line.height).toBe(9 * scale);
          }
        }

        await page
          .locator('[data-slot="collapsible"]')
          .screenshot({ path: info.outputPath("expanded.png") });
      });
    }
  }
}
