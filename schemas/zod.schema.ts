import { z } from 'zod';
import selectorsConfig from '../scrapers/selectors.json';
import { Platform } from '../scrapers/scraper';

// Supported platforms are derived from selectors.json — add a new platform there, not here.
const platforms = Object.keys(selectorsConfig) as [string, ...string[]];

export const NewTrackerDTO = z.object({
  url: z.string().url('Please send a valid product URL.'),
  website: z
    .enum(platforms, {
      errorMap: () => ({ message: 'Unsupported website. Supported: ' + platforms.join(' | ') }),
    })
    .optional(),
});

export function detectPlatform(url: string): Platform | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    for (const platform of platforms) {
      if (hostname.includes(platform)) return platform as Platform;
    }
    return null;
  } catch {
    return null;
  }
}
