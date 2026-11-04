"use client";

import type { MouseEvent } from "react";

import { repositoryUrl } from "../lib/github-stars";
import { useFireworks } from "../registry/ui/fireworks";
import { RedstoneLampDisplay } from "../registry/ui/redstone-lamp-display";
import { NetherStar } from "./nether-star";

/**
 * Header link to the repository: the nether star, then the formatted star count on
 * the Redstone Lamp display. Without a count it shows the star alone. A click
 * also launches the fireworks from the star; the link still opens.
 */
export const StarButton = ({ count }: { count?: string }) => {
  const launch = useFireworks();

  const celebrate = (event: MouseEvent<HTMLAnchorElement>) => {
    launch(
      event.currentTarget.querySelector('[data-slot="nether-star"]') ??
        event.currentTarget
    );
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
      {/* The anchor's label names the count; the display stays out of the accessibility tree. */}
      {count === undefined ? null : (
        <RedstoneLampDisplay value={count} aria-hidden="true" />
      )}
    </a>
  );
};
