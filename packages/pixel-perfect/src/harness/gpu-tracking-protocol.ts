/** Native contexts admitted by the existing webgl/webgl2 guards in the color-painter instrumentation. */
export type TrackedGpuContext = WebGLRenderingContext | WebGL2RenderingContext;

/** Required browser state initialized afresh by the owning test's addInitScript. */
export type GpuTrackingWindow = typeof window & { __gpu: TrackedGpuContext[] };

/** Preserve the native canvas options parameter from the browser API owner. */
export type CanvasContextArguments = [
  options?: Parameters<HTMLCanvasElement["getContext"]>[1],
];
