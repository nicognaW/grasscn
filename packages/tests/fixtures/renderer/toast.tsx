import { setMinecraftSoundVolume } from "@grasscn/web/ui/minecraft-sound";
import { Toaster, toast as notify } from "@grasscn/web/ui/sonner";
import * as React from "react";

const p = new URLSearchParams(location.search);
const scale = Number(p.get("scale") ?? 2) as 1 | 2 | 3;
const count = Number(p.get("count") ?? 1);

const SonnerFixture = () => {
  const [actions, setActions] = React.useState(0);
  const [created, setCreated] = React.useState(0);
  const ids = React.useRef<(string | number)[]>([]);

  const show = () => {
    for (let i = 0; i < count; i += 1) {
      ids.current.push(
        notify(
          p.has("rich") ? (
            <strong>{p.get("label") ?? "World saved"}</strong>
          ) : (
            (p.get("label") ?? "World saved")
          ),
          {
            ...(p.has("text") ? { description: p.get("text")! } : {}),
            ...(p.has("actions")
              ? {
                  action: {
                    label: "Undo",
                    onClick: (event) => {
                      setActions((v) => v + 1);

                      if (p.has("cancelAction")) {
                        event.preventDefault();
                      }
                    },
                  },
                  closeButton: true,
                }
              : {}),
            dismissible: !p.has("disabled"),
            duration: Number(p.get("duration") ?? 5000),
          }
        )
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
        style={{
          height,
          left: x,
          pointerEvents: "none",
          position: "fixed",
          top: y,
          width,
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
