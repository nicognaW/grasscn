"use client";

import ButtonDemo from "../demos/button";

import "./documentation.css";

export const ButtonPlayground = () => (
  <section
    /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
    className="documentation-playground minecraft-example"
    /* eslint-enable shadcn/no-unknown-classes */
    aria-label="Interactive Button playground"
  >
    <ButtonDemo scale={2} />
  </section>
);
