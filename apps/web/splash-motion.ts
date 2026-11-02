// Direct port of SplashRenderer.extractRenderState and Mth.sin from the pinned JAR.
// JOML 1.10.8's default (FASTMATH=false) rotation is rounded to native single-precision values.
const f = Math.fround;
const sineIndexScale = 10430.378350470453;
const angle = f(-0.34906584);
const rotationCos = f(Math.cos(angle)); const 
  rotationSin = f(Math.sin(angle));

export function splashMotion(timeMillis: number, textWidth: number) {
  const phase = f(f(f(Math.trunc(timeMillis) % 1000) / f(1000)) * f(6.2831855));
  const index = Math.trunc(phase * sineIndexScale) & 65535;
  // Compute the selected entry of the vanilla 65,536-entry float sine table.
  const sine = f(Math.sin(index / sineIndexScale));
  const pulse = f(f(1.8) - Math.abs(f(sine * f(0.1))));
  const scale = f(f(pulse * f(100)) / f(textWidth + 32));
  return {
    pulse,
    scale,
    a: f(rotationCos * scale),
    b: f(rotationSin * scale),
    c: f(-rotationSin * scale),
    d: f(rotationCos * scale),
    originX: -Math.trunc(textWidth / 2),
    originY: -8,
  };
}

export function splashTransform(
  motion: ReturnType<typeof splashMotion>,
  guiScale: number
) {
  return `matrix(${motion.a * guiScale},${motion.b * guiScale},${motion.c * guiScale},${motion.d * guiScale},0,0)`;
}
