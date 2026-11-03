import {
  NativeSelect,
  NativeSelectOption,
  NativeSelectOptGroup,
} from "@grasscn/web/ui/native-select";
import * as React from "react";

export const NativeSelectFixture = () => {
  const q = new URLSearchParams(location.search);
  // SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
  const scale = Number(q.get("scale") ?? 2) as 1 | 2 | 3;
  const [value, setValue] = React.useState("one");
  const [selected, setSelected] = React.useState("");
  const [tag, setTag] = React.useState("");
  const ref = React.useRef<HTMLSelectElement>(null);

  React.useLayoutEffect(() => {
    document.documentElement.style.background = document.body.style.background =
      q.get("background") ?? "#202020";
  }, []);

  if (q.has("native")) {
    return (
      <NativeSelect
        id="subject"
        scale={scale}
        disabled={q.get("state")?.startsWith("disabled")}
        wrapperProps={{
          style: {
            left: Number(q.get("x") ?? 16) * scale,
            position: "fixed",
            top: Number(q.get("y") ?? 16) * scale,
          },
        }}
        className="fixture-geometry-width fixture-geometry-height"
        style={{
          "--fixture-height": `${Number(q.get("height") ?? 20) * scale}px`,
          "--fixture-width": `${Number(q.get("width") ?? 200) * scale}px`,
        }}
        data-subject="true"
      >
        <NativeSelectOption value="value">
          {q.get("label") ?? ""}
        </NativeSelectOption>
      </NativeSelect>
    );
  }

  return (
    <form
      id="form"
      onSubmit={(event) => {
        event.preventDefault();
        setSelected(
          JSON.stringify([...new FormData(event.currentTarget).entries()])
        );
      }}
    >
      <NativeSelect
        aria-label="Controlled choice"
        name="choice"
        ref={ref}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
        }}
      >
        <NativeSelectOption value="one">One</NativeSelectOption>
        <NativeSelectOptGroup label="Worlds">
          <NativeSelectOption value="two">世界</NativeSelectOption>
          <NativeSelectOption value="blocked" disabled>
            Disabled
          </NativeSelectOption>
        </NativeSelectOptGroup>
      </NativeSelect>
      <NativeSelect
        aria-label="Default choice"
        defaultValue="two"
        name="default"
      >
        <NativeSelectOption value="one">One</NativeSelectOption>
        <NativeSelectOption value="two">Two</NativeSelectOption>
      </NativeSelect>
      <NativeSelect
        aria-label="Required choice"
        required
        name="required"
        defaultValue=""
      >
        <NativeSelectOption value="">Choose</NativeSelectOption>
        <NativeSelectOption value="yes">Yes</NativeSelectOption>
      </NativeSelect>
      <NativeSelect aria-label="Disabled choice" disabled name="disabled">
        <NativeSelectOption>Disabled</NativeSelectOption>
      </NativeSelect>
      <NativeSelect
        aria-label="Multiple choices"
        multiple
        name="multiple"
        defaultValue={["a", "c"]}
      >
        <NativeSelectOption value="a">A</NativeSelectOption>
        <NativeSelectOption value="b">B</NativeSelectOption>
        <NativeSelectOption value="c">C</NativeSelectOption>
      </NativeSelect>
      <button
        type="button"
        id="read-ref"
        onClick={() => {
          setTag(ref.current?.tagName ?? "");
        }}
      >
        Read ref
      </button>
      <output id="ref">{tag}</output>
      <button type="reset">Reset</button>
      <button type="submit">Submit</button>
      <output id="result">{selected}</output>
    </form>
  );
};
