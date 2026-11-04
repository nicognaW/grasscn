"use client";

import type { MouseEvent } from "react";
import { useRef } from "react";

import { repositoryUrl } from "../lib/github-stars";
import { useFireworks } from "../registry/ui/fireworks";
import { MinecraftText } from "../registry/ui/minecraft-text";
import { RedstoneLampDisplay } from "../registry/ui/redstone-lamp-display";
import { NetherStar } from "./nether-star";

/** Time the firework plays before the repository opens: past the blast (1.3 s) and into the twinkle (2.1 s). */
export const starButtonOpenDelayMs = 2500;

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Opens the repository in a new tab, keeping the referrer and cutting the opener. Falls back to this tab when a popup blocker refuses. */
const openRepository = () => {
  const opened = window.open(repositoryUrl, "_blank");

  if (opened === null) {
    window.location.assign(repositoryUrl);

    return;
  }

  opened.opener = null;
};

/**
 * Header link to the repository: the nether star, the GitHub label, then the formatted
 * star count on the Redstone Lamp display. Without a count it shows the star and label.
 * A plain click launches the fireworks from the star and opens the repository after
 * `starButtonOpenDelayMs`, so the firework is seen first; under reduced motion it opens
 * at once. Modified and middle clicks keep the browser's own link handling.
 */
export const StarButton = ({ count }: { count?: string }) => {
  const launch = useFireworks();
  // Rapid clicks each launch a firework but open the repository once.
  const openPending = useRef(false);

  const celebrate = (event: MouseEvent<HTMLAnchorElement>) => {
    launch(
      event.currentTarget.querySelector('[data-slot="nether-star"]') ??
        event.currentTarget
    );

    const plainClick =
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey;

    if (!plainClick) {
      return;
    }

    event.preventDefault();

    if (openPending.current) {
      return;
    }

    if (prefersReducedMotion()) {
      openRepository();

      return;
    }

    openPending.current = true;
    window.setTimeout(() => {
      openPending.current = false;
      openRepository();
    }, starButtonOpenDelayMs);
  };

  return (
    <a
      className="minecraft-star-button"
      href={repositoryUrl}
      // oxlint-disable-next-line react/jsx-no-target-blank -- noopener isolates the tab; the referrer stays so GitHub traffic shows the site.
      target="_blank"
      rel="noopener"
      aria-label={
        count === undefined
          ? "Star grasscn on GitHub"
          : `Star grasscn on GitHub, ${count} stars`
      }
      onClick={celebrate}
    >
      {/* The nether star GUI item UI port, decorative under the anchor label. */}
      <span data-slot="star-button-star">
        <NetherStar />
      </span>
      <span data-slot="star-button-label">
        <MinecraftText>GitHub</MinecraftText>
      </span>
      {/* The anchor's label names the count; the display stays out of the accessibility tree. */}
      {count === undefined ? null : (
        <RedstoneLampDisplay value={count} aria-hidden="true" />
      )}
    </a>
  );
};
