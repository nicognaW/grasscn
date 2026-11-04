import {
  getMinecraftSoundVolume,
  setMinecraftSoundVolume,
} from "./registry/ui/minecraft-sound";

// The site frame loads this module on every page, so every site sound (the
// header fireworks included) starts at 50% master; the demos read and change
// it here. Keep the registry's default gain intact.
setMinecraftSoundVolume(0.5);

export const getPreviewSoundVolume = function getPreviewSoundVolume() {
  return Math.round(getMinecraftSoundVolume() * 100);
};

export const setPreviewSoundVolume = function setPreviewSoundVolume(
  percent: number
) {
  setMinecraftSoundVolume(percent / 100);
};
