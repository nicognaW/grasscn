import { getMinecraftSoundVolume } from "./minecraft-sound";
import { tradingSounds } from "./minecraft-trading-sound-assets";

export function playTradingSound() {
  const master = getMinecraftSoundVolume();

  if (typeof Audio === "undefined" || master === 0) {
    return;
  }

  const clip = tradingSounds[Math.floor(Math.random() * tradingSounds.length)];
  const sound = new Audio(clip.src);

  sound.volume = Math.min(1, master * clip.volume);
  sound.playbackRate = clip.pitch;
  void sound.play().catch(() => {
    /* empty */
  });
}
