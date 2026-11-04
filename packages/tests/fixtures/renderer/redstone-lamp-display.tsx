// Rendering fixture for the Redstone Lamp display UI port:
// /redstone-lamp-display.html?value=1234[&label=...]
// A refused value is reported in a role="alert" paragraph.
import { RedstoneLampDisplay } from "@grasscn/web/ui/redstone-lamp-display";
import { createRoot } from "react-dom/client";

const root = document.querySelector<HTMLElement>("#root");
const status = document.querySelector<HTMLElement>("#status");

if (root === null || status === null) {
  throw new Error("Fixture root missing");
}

const parameters = new URLSearchParams(location.search);
const label = parameters.get("label") ?? undefined;

createRoot(root, {
  onUncaughtError: (error) => {
    status.textContent = error instanceof Error ? error.message : String(error);
  },
}).render(
  <RedstoneLampDisplay
    id="subject"
    data-subject="true"
    aria-label={label}
    value={parameters.get("value") ?? "0"}
  />
);
