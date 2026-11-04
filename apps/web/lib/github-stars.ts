import { z } from "zod";

export const repositoryUrl = "https://github.com/nicognaW/grasscn";

const repositoryApiUrl = "https://api.github.com/repos/nicognaW/grasscn";

// Only counts the Redstone Lamp display can draw: no sign, fraction or exponent.
const repositorySchema = z.object({
  stargazers_count: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
});

/** Display string for a star count: exact below 1000, otherwise whole thousands with `k`. */
export const formatStarCount = (count: number): string =>
  count < 1000 ? String(count) : `${Math.round(count / 1000)}k`;

/**
 * The repository's formatted star count from the GitHub repository API, or
 * `undefined` on any failure. Next caches the response for an hour.
 */
export const loadStarCount = async (): Promise<string | undefined> => {
  // Unauthenticated requests fit the hourly revalidation; a token only raises the rate limit.
  const token = process.env.GITHUB_TOKEN ?? "";

  const init: RequestInit & { next: { revalidate: number } } = {
    headers: token === "" ? undefined : { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(3000),
  };

  try {
    const response = await fetch(repositoryApiUrl, init);

    if (!response.ok) {
      return undefined;
    }

    const repository = repositorySchema.safeParse(await response.json());

    return repository.success
      ? formatStarCount(repository.data.stargazers_count)
      : undefined;
  } catch {
    return undefined;
  }
};
