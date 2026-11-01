import { getMinecraftSoundVolume } from "./minecraft-sound";
import { minecraftToastSounds } from "./minecraft-toast-sound-assets";

let playedThisFrame = false;

export function playMinecraftToastSound(event: "in" | "out") {
  if (playedThisFrame || typeof Audio === "undefined") {
    return;
  }

  playedThisFrame = true;
  requestAnimationFrame(() => {
    playedThisFrame = false;
  });
  const volume = 0.4 * getMinecraftSoundVolume();

  if (volume === 0) {
    return;
  }

  const voice = new Audio(minecraftToastSounds[event]);
  voice.volume = volume;
  voice.playbackRate = 1;
  void voice.play().catch(() => {
    /* empty */
  });
}
