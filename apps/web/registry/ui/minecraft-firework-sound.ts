import type { FireworkSound } from "./minecraft-firework-explosion";
import { fireworkSounds } from "./minecraft-firework-sound-assets";
import { getMinecraftSoundVolume } from "./minecraft-sound";

// The near variants only; the _far sounds are not embedded.
const clips = {
  "entity.firework_rocket.large_blast": fireworkSounds.largeBlast,
  "entity.firework_rocket.launch": fireworkSounds.launch,
  "entity.firework_rocket.twinkle": fireworkSounds.twinkle,
} as const;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * Plays one firework sound as the 26.2 SoundEngine starts it: the event's
 * only variant (weight, volume and pitch 1), gain = clamp(volume, 0, 1)
 * times the master volume (the category volume; the ambient slider stays at
 * its default 1), and rate = clamp(pitch, 0.5, 2) with the pitch shifted as
 * OpenAL resamples. Positional attenuation is left out: the listener is
 * declared within 10 blocks of the firework (web adaptation).
 */
export const playFireworkSound = (sound: FireworkSound) => {
  const master = getMinecraftSoundVolume();

  if (typeof Audio === "undefined" || master === 0) {
    return;
  }

  const [source] = clips[sound.sound];
  const voice = new Audio(source);

  voice.volume = clamp(sound.volume, 0, 1) * master;
  voice.preservesPitch = false;
  voice.playbackRate = clamp(sound.pitch, 0.5, 2);
  // A separate voice per sound, so overlapping launches overlap as in game.
  void voice.play().catch(() => {
    /* empty */
  });
};

/** Plays the sounds one simulation tick returned, in order. */
export const playFireworkSounds = (sounds: readonly FireworkSound[]) => {
  for (const sound of sounds) {
    playFireworkSound(sound);
  }
};
