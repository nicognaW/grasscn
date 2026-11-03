import type { Page } from "@playwright/test";

export interface RecordedAudioPlayback {
  rate: number;
  source: string;
  volume: number;
}

export interface RecordedOriginalClick {
  original: boolean;
  rate: number;
  volume: number;
}

export interface RecordedPitchedPlayback {
  pitch: number;
  source: string;
  volume: number;
}

interface AudioPlaybackFixture {
  __soundVoices: RecordedAudioPlayback[];
}

interface OriginalClickFixture {
  voices: RecordedOriginalClick[];
}

interface PitchedPlaybackFixture {
  sounds: RecordedPitchedPlayback[];
}

interface AudioSourceFixture {
  sounds: string[];
}

/** Register before navigation so every document starts with an empty audio trace. */
export const recordAudioPlayback = async (page: Page) => {
  await page.addInitScript(() => {
    const recordings: RecordedAudioPlayback[] = [];
    const fixture = Object.assign(window, { __soundVoices: recordings });

    // oxlint-disable-next-line typescript/promise-function-async -- This browser API stub records synchronously and returns its original fulfilled Promise; async would change throw and Promise-adoption timing.
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
    const fixture = window as typeof window & AudioPlaybackFixture;

    return fixture.__soundVoices;
  });

/** Keep the asset-origin observation used by Attachment and NativeSelect. */
export const recordOriginalClick = async (page: Page) => {
  await page.addInitScript(() => {
    const recordings: RecordedOriginalClick[] = [];
    const fixture = Object.assign(window, { voices: recordings });

    // oxlint-disable-next-line typescript/promise-function-async -- This browser API stub records synchronously and returns its original fulfilled Promise; async would change throw and Promise-adoption timing.
    HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) {
      fixture.voices.push({
        original: this.src.startsWith("data:audio/ogg;base64,"),
        rate: this.playbackRate,
        volume: this.volume,
      });

      return Promise.resolve();
    };
  });
};

export const recordedOriginalClicks = async (page: Page) =>
  await page.evaluate(() => {
    // SAFETY: recordOriginalClick initializes this exact observation format before navigation.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Paired reader for the fixture-owned original-click installation.
    const fixture = window as typeof window & OriginalClickFixture;

    return fixture.voices;
  });

/** Preserve the existing pitch-named observation used by native navigation tests. */
export const recordPitchedPlayback = async (page: Page) => {
  await page.addInitScript(() => {
    const recordings: RecordedPitchedPlayback[] = [];
    const fixture = Object.assign(window, { sounds: recordings });

    // oxlint-disable-next-line typescript/promise-function-async -- This browser API stub records synchronously and returns its original fulfilled Promise; async would change throw and Promise-adoption timing.
    HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) {
      fixture.sounds.push({
        pitch: this.playbackRate,
        source: this.src,
        volume: this.volume,
      });

      return Promise.resolve();
    };
  });
};

export const recordedPitchedPlayback = async (page: Page) =>
  await page.evaluate(() => {
    // SAFETY: recordPitchedPlayback installs this pitch/source/volume trace on each document.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Paired reader for the fixture-owned pitched-playback installation.
    const fixture = window as typeof window & PitchedPlaybackFixture;

    return fixture.sounds;
  });

/** Source-only traces retain the silence assertions without inventing media fields. */
export const recordAudioSources = async (page: Page) => {
  await page.addInitScript(() => {
    const recordings: string[] = [];
    const fixture = Object.assign(window, { sounds: recordings });

    // oxlint-disable-next-line typescript/promise-function-async -- This browser API stub records synchronously and returns its original fulfilled Promise; async would change throw and Promise-adoption timing.
    HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) {
      fixture.sounds.push(this.src);

      return Promise.resolve();
    };
  });
};

export const recordedAudioSources = async (page: Page) =>
  await page.evaluate(() => {
    // SAFETY: recordAudioSources installs this source-only trace before the tested document loads.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Paired reader for the fixture-owned source trace.
    const fixture = window as typeof window & AudioSourceFixture;

    return fixture.sounds;
  });
