import { setMinecraftSoundVolume } from "@grasscn/web/ui/minecraft-sound";
import { Toaster, toast as notify } from "@grasscn/web/ui/sonner";
import * as React from "react";

const p = new URLSearchParams(location.search);

// SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
const scale =
  // SAFETY: owned fixture callers serialize the public GUI scales 1, 2, or 3; the existing Number conversion, default and component validation remain unchanged.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
  Number(p.get("scale") ?? 2) as 1 | 2 | 3;

const count = Number(p.get("count") ?? 1);

const SonnerFixture = () => {
  const [actions, setActions] = React.useState(0);
  const [created, setCreated] = React.useState(0);
  const ids = React.useRef<(string | number)[]>([]);

  const show = () => {
    for (let i = 0; i < count; i += 1) {
      const toastIds = ids.current;
      const appendToastId = toastIds.push;
      const createToast = notify;

      const notificationContent = p.has("rich") ? (
        <strong>{p.get("label") ?? "World saved"}</strong>
      ) : (
        (p.get("label") ?? "World saved")
      );

      const notificationOptions: NonNullable<Parameters<typeof notify>[1]> = {};

      if (p.has("text")) {
        notificationOptions.description = p.get("text");
      }

      if (p.has("actions")) {
        notificationOptions.action = {
          label: "Undo",
          onClick: (event) => {
            setActions((v) => v + 1);

            if (p.has("cancelAction")) {
              event.preventDefault();
            }
          },
        };
        notificationOptions.closeButton = true;
      }

      notificationOptions.dismissible = !p.has("disabled");
      notificationOptions.duration = Number(p.get("duration") ?? 5000);
      appendToastId.call(
        toastIds,
        createToast(notificationContent, notificationOptions)
      );
    }

    setCreated((v) => v + count);
  };

  React.useEffect(() => {
    if (!p.has("closed")) {
      show();
    }
  }, []);

  const x = Number(p.get("x") ?? 16) * scale;
  const y = Number(p.get("y") ?? 16) * scale;
  const width = Number(p.get("width") ?? 190) * scale;
  const height = Number(p.get("height") ?? 32) * scale;

  return (
    <>
      <Toaster
        scale={scale}
        position="top-right"
        offset={p.has("native") ? { right: innerWidth - x - width, top: y } : 0}
      />
      <div
        id="subject"
        className="fixture-geometry-height fixture-geometry-x fixture-placement-fixed fixture-geometry-y fixture-geometry-width fixture-owned-inline-1"
        style={{
          "--fixture-height": `${height}px`,
          "--fixture-width": `${width}px`,
          "--fixture-x": `${x}px`,
          "--fixture-y": `${y}px`,
        }}
        data-subject="true"
      />
      <button type="button" id="open" onClick={show}>
        Open toast
      </button>
      <button
        type="button"
        id="close"
        onClick={() => {
          notify.dismiss();
        }}
      >
        Close toast
      </button>
      <button
        type="button"
        id="update"
        onClick={() => {
          notify("Updated 世界", {
            description: "こんにちは",
            id: ids.current[0],
          });
        }}
      >
        Update toast
      </button>
      <button
        type="button"
        id="promise"
        onClick={() => {
          notify.promise(Promise.resolve("Saved"), {
            error: "Save failed",
            loading: "Saving world",
            success: "World saved",
          });
        }}
      >
        Save promise
      </button>
      <output id="actions">{actions}</output>
      <output id="created">{created}</output>
    </>
  );
};

const StrictFixture = () => {
  const [tag, setTag] = React.useState("");
  const ref = React.useRef<HTMLElement>(null);

  return (
    <>
      <Toaster ref={ref} />
      <button
        type="button"
        id="show"
        onClick={() => {
          notify("World saved");
        }}
      >
        Show
      </button>
      <button
        type="button"
        id="read-ref"
        onClick={() => {
          setTag(ref.current?.tagName ?? "");
        }}
      >
        Read ref
      </button>
      <output id="ref-tag">{tag}</output>
    </>
  );
};

export const ToastFixture = () => {
  document.documentElement.style.background = p.get("background") ?? "#202020";
  document.body.style.background = p.get("background") ?? "#202020";

  if (p.has("native")) {
    setMinecraftSoundVolume(0);
  } else if (p.has("volume")) {
    setMinecraftSoundVolume(Number(p.get("volume")));
  }

  return p.get("component") === "sonner-strict" ? (
    <React.StrictMode>
      <StrictFixture />
    </React.StrictMode>
  ) : (
    <SonnerFixture />
  );
};
