import { z } from 'zod';
import selectorsConfig from '../scraper/selectors.json';
import { Platform } from '../scraper';

// Supported platforms are derived from selectors.json — add a new platform there, not here.
const platforms = Object.keys(selectorsConfig) as Platform[];
// zod v4 z.enum() takes a Record<string, string> — convert the array to an object
const platformsEnum = Object.fromEntries(platforms.map((p) => [p, p])) as Record<Platform, Platform>;
const platformList = platforms.join(' | ');

export const NewTrackerDTO = z.object({
  url: z.string().url('Please send a valid product URL.'),
  website: z
    .enum(platformsEnum, { error: `Unsupported website. Supported: ${platformList}` })
    .optional(),
});

export function detectPlatform(url: string): Platform | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    for (const platform of platforms) {
      if (hostname.includes(platform)) return platform;
    }
    return null;
  } catch {
    return null;
  }
}
