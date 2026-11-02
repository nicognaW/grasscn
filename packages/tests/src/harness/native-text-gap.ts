/** Measure both native paint boxes in one browser frame, independent of tooltip translation. */
export const nativeTextGap = (
  element: Element,
  expected: { label: string; value: string }
): number => {
  const labels = [...element.querySelectorAll(".mc-bitmap")];

  const name = labels
    .find((label) => label.textContent === expected.label)
    ?.querySelector(".mc-text-pixels");

  const value = labels
    .find((label) => label.textContent === expected.value)
    ?.querySelector(".mc-text-pixels");

  if (!name || !value) {
    throw new Error("The default native tooltip row must be painted");
  }

  return value.getBoundingClientRect().x - name.getBoundingClientRect().right;
};
