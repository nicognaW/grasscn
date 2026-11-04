// Rendering fixture for the nether star UI port: /nether-star.html?glint=0
// draws the header's NetherStar at one fixed glint time in milliseconds.
import { NetherStar } from "@grasscn/web/components/nether-star";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

const root = document.querySelector<HTMLElement>("#root");

if (root === null) {
  throw new Error("Fixture root missing");
}

const glint = Number(new URLSearchParams(location.search).get("glint") ?? "0");

flushSync(() => {
  createRoot(root).render(<NetherStar glintMillis={glint} />);
});

const star = root.querySelector<HTMLCanvasElement>("[data-slot='nether-star']");

if (star === null) {
  throw new Error("Nether star did not render");
}

// The compared subject is the star's own canvas.
star.dataset.subject = "true";
