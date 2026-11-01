import { Button } from "@grasscn/web/ui/button";
import * as React from "react";

export const ButtonCompositionFixture = () => {
  const p = new URLSearchParams(location.search);
  const scale = Number(p.get("scale") ?? 2) as 1 | 2 | 3;
  const mode = p.get("composition") ?? "split";
  const label = p.get("label") ?? "Button";
  const [count, setCount] = React.useState(0);

  let content: React.ReactNode;

  if (mode === "split") {
    content = [label.slice(0, 3), label.slice(3)];
  } else if (mode === "numeric") {
    content = [label.slice(0, -2), Number(label.at(-2)), Number(label.at(-1))];
  } else if (mode === "fragments") {
    content = (
      <>
        {label.slice(0, 2)}
        <React.Fragment>
          {label.slice(2, 4)}
          <>{label.slice(4)}</>
        </React.Fragment>
      </>
    );
  } else if (mode === "empty") {
    content = [label.slice(0, 3), null, false, undefined, label.slice(3)];
  } else {
    content = [
      <svg
        key="icon"
        data-testid="consumer-icon"
        aria-hidden="true"
        width={8 * scale}
        height={8 * scale}
      >
        <rect width="100%" height="100%" fill="white" />
      </svg>,
      <span
        key="rich"
        data-testid="consumer-rich"
        data-preserved="yes"
        onClick={() => {
          setCount((v) => v + 1);
        }}
      >
        Rich content
      </span>,
      " Tail",
    ];
  }

  return (
    <>
      <Button
        id="subject"
        scale={scale}
        disabled={p.get("state") === "disabled"}
        style={{
          left: Number(p.get("x") ?? 16) * scale,
          position: "fixed",
          top: Number(p.get("y") ?? 16) * scale,
          width: Number(p.get("width") ?? 200) * scale,
        }}
        data-subject="true"
      >
        {content}
      </Button>
      <output aria-label="Rich child events">{count}</output>
    </>
  );
};
