import { repositoryUrl } from "../lib/github-stars";
import { MinecraftText } from "../registry/ui/minecraft-text";
import { RedstoneLampDisplay } from "../registry/ui/redstone-lamp-display";

/**
 * Header link to the repository: the star, then the formatted star count on
 * the Redstone Lamp display. Without a count it shows the star alone.
 */
export const StarButton = ({ count }: { count?: string }) => (
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
  >
    {/* Star slot: a text placeholder until the nether star UI port replaces it. */}
    <span data-slot="star-button-star">
      <MinecraftText>GitHub</MinecraftText>
    </span>
    {/* The anchor's label names the count; the display stays out of the accessibility tree. */}
    {count === undefined ? null : (
      <RedstoneLampDisplay value={count} aria-hidden="true" />
    )}
  </a>
);
