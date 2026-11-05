// Direct port of SplashRenderer.extractRenderState and Mth.sin from the pinned JAR.
// JOML 1.10.8's default (FASTMATH=false) rotation is rounded to native single-precision values.
const f = Math.fround;
const sineIndexScale = 10_430.378350470453;
const angle = f(-0.34906584);
const rotationCos = f(Math.cos(angle));
const rotationSin = f(Math.sin(angle));

export const splashMotion = function splashMotion(
  timeMillis: number,
  textWidth: number
) {
  const phase = f(f(f(Math.trunc(timeMillis) % 1000) / f(1000)) * f(6.2831855));
  // oxlint-disable-next-line eslint/no-bitwise -- Native Mth.sin selects the low 16 bits of its 65,536-entry sine-table index; the pinned native/JOML oracle verifies all 1,000 splash phases.
  const index = Math.trunc(phase * sineIndexScale) & 65_535;
  // Compute the selected entry of the vanilla 65,536-entry float sine table.
  const sine = f(Math.sin(index / sineIndexScale));
  const pulse = f(f(1.8) - Math.abs(f(sine * f(0.1))));
  const scale = f(f(pulse * f(100)) / f(textWidth + 32));

  return {
    a: f(rotationCos * scale),
    b: f(rotationSin * scale),
    c: f(-rotationSin * scale),
    d: f(rotationCos * scale),
    originX: -Math.trunc(textWidth / 2),
    originY: -8,
    pulse,
    scale,
  };
};

export const splashTransform = function splashTransform(
  motion: ReturnType<typeof splashMotion>,
  guiScale: number
) {
  return `matrix(${motion.a * guiScale},${motion.b * guiScale},${motion.c * guiScale},${motion.d * guiScale},0,0)`;
};
