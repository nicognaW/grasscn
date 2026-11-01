import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@grasscn/web/ui/input-otp";
import * as React from "react";
export function InputOTPFixture() {
  const q = new URLSearchParams(location.search),
    scale = Number(q.get("scale") ?? 2) as 1 | 2 | 3,
    native = q.has("native"),
    state = q.get("state") ?? "normal",
    [value, setValue] = React.useState(q.get("text") ?? ""),
    [complete, setComplete] = React.useState(0),
    ref = React.useRef<HTMLInputElement>(null),
    [tag, setTag] = React.useState("");
  React.useLayoutEffect(() => {
    document.documentElement.style.background = document.body.style.background =
      q.get("background") ?? "#202020";
  }, []);
  const root = (
    <InputOTP
      ref={ref}
      aria-label="One-time code"
      name="code"
      scale={scale}
      maxLength={native ? 1 : 6}
      value={value}
      onChange={setValue}
      onComplete={() => setComplete((n) => n + 1)}
      disabled={state === "disabled" || q.has("disabled")}
      readOnly={state.includes("readonly") || q.has("readOnly")}
      pattern={q.has("digits") ? "^[0-9]+$" : undefined}
      pasteTransformer={
        q.has("stripHyphens") ? (v) => v.replaceAll("-", "") : undefined
      }
      pushPasswordManagerStrategy="none"
    >
      <InputOTPGroup>
        {Array.from({ length: native ? 1 : 6 }, (_, i) => (
          <React.Fragment key={i}>
            {!native && i === 3 && <InputOTPSeparator />}
            <InputOTPSlot
              id={native ? "subject" : undefined}
              index={i}
              style={
                native
                  ? {
                      width: Number(q.get("width") ?? 20) * scale,
                      height: Number(q.get("height") ?? 20) * scale,
                    }
                  : undefined
              }
              data-subject={
                (native ? "subject" : undefined) === "subject"
                  ? "true"
                  : undefined
              }
            />
          </React.Fragment>
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
  if (native)
    return (
      <div
        style={{
          position: "fixed",
          left: Number(q.get("x") ?? 16) * scale,
          top: Number(q.get("y") ?? 16) * scale,
          width: Number(q.get("width") ?? 20) * scale,
          height: Number(q.get("height") ?? 20) * scale,
        }}
      >
        {root}
      </div>
    );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setTag(String(new FormData(e.currentTarget).get("code")));
      }}
    >
      {root}
      {!native && (
        <>
          <button type="submit">Save code</button>
          <button
            type="button"
            onClick={() => setTag(ref.current?.tagName ?? "")}
          >
            Read ref
          </button>
          <output aria-label="Code value">{value}</output>
          <output aria-label="Completions">{complete}</output>
          <output aria-label="Code output">{tag}</output>
        </>
      )}
    </form>
  );
}
