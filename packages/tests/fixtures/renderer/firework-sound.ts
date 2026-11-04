// Sound fixture for the firework rocket UI port:
// /firework-sound.html?volume=0.5
//
// The button runs one rocket simulation at 20 ticks per second and plays the
// sounds each tick returns. body[data-tick] holds the current tick and
// body[data-done] marks the end of the sequence.
import {
  FIREWORK_ROCKET_SPAWN,
  FireworkRocketSimulation,
} from "@grasscn/web/ui/minecraft-firework-rocket";
import { playFireworkSounds } from "@grasscn/web/ui/minecraft-firework-sound";
import { setMinecraftSoundVolume } from "@grasscn/web/ui/minecraft-sound";

const TICK_MILLISECONDS = 50;

const button = document.querySelector<HTMLButtonElement>("#subject");

if (button === null) {
  throw new Error("Fixture button missing");
}

setMinecraftSoundVolume(
  Number(new URLSearchParams(location.search).get("volume") ?? "1")
);

button.addEventListener("click", () => {
  const simulation = new FireworkRocketSimulation(FIREWORK_ROCKET_SPAWN);
  delete document.body.dataset.done;

  const timer = setInterval(() => {
    const sounds = simulation.tick();
    document.body.dataset.tick = String(simulation.ticks);
    playFireworkSounds(sounds);

    if (simulation.done) {
      clearInterval(timer);
      document.body.dataset.done = "true";
    }
  }, TICK_MILLISECONDS);
});
