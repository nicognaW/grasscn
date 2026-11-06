import { Button } from "@grasscn/web/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@grasscn/web/ui/dialog";
import * as React from "react";

export const DialogFooterFixture = () => {
  const p = new URLSearchParams(location.search);

  // SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
  const scale =
    // SAFETY: owned fixture callers serialize the public GUI scales 1, 2, or 3; the existing Number conversion, default and component validation remain unchanged.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
    Number(p.get("scale") ?? 2) as 1 | 2 | 3;

  const [count, setCount] = React.useState(0);
  const [tag, setTag] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);

  let enabled: true | false | undefined;

  if (p.has("enabled")) {
    enabled = true;
  } else if (p.has("explicitFalse")) {
    enabled = false;
  } else {
    enabled = undefined;
  }

  return (
    <>
      <Dialog scale={scale}>
        <DialogTrigger>Open footer</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Footer actions</DialogTitle>
            <DialogDescription>Use footer buttons.</DialogDescription>
          </DialogHeader>
          <DialogFooter
            ref={ref}
            showCloseButton={enabled}
            data-forwarded="kept"
            className="custom-footer"
          >
            <Button
              scale={scale}
              onClick={() => {
                setCount((v) => v + 1);
              }}
            >
              Existing action
            </Button>
            {p.has("extra") && <Button scale={scale}>Another action</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <button
        type="button"
        id="inspect-footer"
        onClick={() => {
          setTag(ref.current?.tagName ?? "none");
        }}
      >
        Read ref
      </button>
      <output id="footer-ref">{tag}</output>
      <output id="footer-events">{count}</output>
    </>
  );
};
