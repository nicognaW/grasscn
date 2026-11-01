"use client";

import ButtonDemo from "../demos/button";

import "./documentation.css";

export function ButtonPlayground() {
  return (
    <section
      className="documentation-playground minecraft-example"
      aria-label="Interactive Button playground"
    >
      <ButtonDemo scale={2} />
    </section>
  );
}
