import type { Page } from "@playwright/test";

export interface RecordedAudioPlayback {
  rate: number;
  source: string;
  volume: number;
}

interface AudioPlaybackFixture {
  __soundVoices: RecordedAudioPlayback[];
}

/** Register before navigation so every document starts with an empty audio trace. */
export const recordAudioPlayback = async (page: Page) => {
  await page.addInitScript(() => {
    const recordings: RecordedAudioPlayback[] = [];
    const fixture = Object.assign(window, { __soundVoices: recordings });

    HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) {
      fixture.__soundVoices.push({
        rate: this.playbackRate,
        source: this.src,
        volume: this.volume,
      });

      return Promise.resolve();
    };
  });
};

/** Read after navigating a page initialized by recordAudioPlayback. */
export const recordedAudioPlayback = async (page: Page) =>
  await page.evaluate(() => {
    // SAFETY: recordAudioPlayback installs this one fixture state on each document before its controls can play.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- This is the paired reader of the fixture-owned initialization above.
    const fixture = window as Window & AudioPlaybackFixture;

    return fixture.__soundVoices;
  });
