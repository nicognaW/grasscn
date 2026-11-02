import {
  getMinecraftSoundVolume,
  setMinecraftSoundVolume,
} from "./registry/ui/minecraft-sound";

// This module is eagerly loaded with the demos, including filtered previews.
// Keep the registry's default gain intact; the preview starts at 50% master.
setMinecraftSoundVolume(0.5);

export function getPreviewSoundVolume() {
  return Math.round(getMinecraftSoundVolume() * 100);
}
export function setPreviewSoundVolume(percent: number) {
  setMinecraftSoundVolume(percent / 100);
}
