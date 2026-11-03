import * as React from "react";

/** Logical pixels available inside a preview stage, excluding its padding. */
export const useDemoWidth = function useDemoWidth(scale: 1 | 2 | 3) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(200);
  React.useLayoutEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const measure = () => {
      const style = getComputedStyle(element);

      const pixels =
        element.clientWidth -
        // oxlint-disable-next-line unicorn/prefer-number-coercion -- CSS lengths intentionally retain unit suffixes; parseFloat extracts the numeric prefix while Number would reject px values.
        parseFloat(style.paddingLeft) -
        // oxlint-disable-next-line unicorn/prefer-number-coercion -- CSS lengths intentionally retain unit suffixes; parseFloat extracts the numeric prefix while Number would reject px values.
        parseFloat(style.paddingRight);

      if (pixels > 0) {
        setWidth(Math.max(1, Math.floor(pixels / scale)));
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [scale]);

  return { ref, width };
};
