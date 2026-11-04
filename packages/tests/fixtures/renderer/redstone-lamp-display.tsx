// Rendering fixture for the Redstone Lamp display UI port:
// /redstone-lamp-display.html?value=0
import { RedstoneLampDisplay } from "@grasscn/web/ui/redstone-lamp-display";
import { createRoot } from "react-dom/client";

const root = document.querySelector<HTMLElement>("#root");

if (root === null) {
  throw new Error("Fixture root missing");
}

createRoot(root).render(
  <RedstoneLampDisplay
    id="subject"
    data-subject="true"
    value={new URLSearchParams(location.search).get("value") ?? "0"}
  />
);
