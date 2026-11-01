"use client";
import Demo0 from "../demos/checkbox";
import Demo13 from "../demos/combobox";
import Demo14 from "../demos/form";
import Demo2 from "../demos/input";
import Demo11 from "../demos/input-group";
import Demo12 from "../demos/input-otp";
import Demo4 from "../demos/label";
import Demo10 from "../demos/native-select";
import Demo15 from "../demos/questionnaire";
import Demo6 from "../demos/radio-group";
import Demo5 from "../demos/select";
import Demo1 from "../demos/slider";
import Demo7 from "../demos/switch";
import Demo3 from "../demos/textarea";
import Demo8 from "../demos/toggle";
import Demo9 from "../demos/toggle-group";
const playgrounds = {
  checkbox: Demo0,
  slider: Demo1,
  input: Demo2,
  textarea: Demo3,
  label: Demo4,
  select: Demo5,
  "radio-group": Demo6,
  switch: Demo7,
  toggle: Demo8,
  "toggle-group": Demo9,
  "native-select": Demo10,
  "input-group": Demo11,
  "input-otp": Demo12,
  combobox: Demo13,
  form: Demo14,
  questionnaire: Demo15,
};
export function InputPlayground({ name }: { name: keyof typeof playgrounds }) {
  const Playground = playgrounds[name];
  return (
    <section
      className="documentation-playground minecraft-example"
      aria-label={`${name} interactive playground`}
    >
      <Playground scale={2} />
    </section>
  );
}
