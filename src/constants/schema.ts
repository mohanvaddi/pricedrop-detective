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
  alertPrice: z.number().positive().optional(),
  notifyEveryChange: z.boolean().optional(),
  listId: z.string().uuid().optional(),
});

/** Maps hostname substrings to platform keys. Order matters — more specific first. */
const HOSTNAME_MAP: Array<[string, Platform]> = [
  ['amazon.in', 'amazon'],
  ['amazon.com', 'amazon'],
  ['amzn.in', 'amazon'],
  ['flipkart.com', 'flipkart'],
  ['myntra.com', 'myntra'],
  ['ajio.com', 'ajio'],
  ['tatacliq.com', 'tatacliq'],
  ['ikea.com', 'ikea'],
  ['decathlon.in', 'decathlon'],
  ['decathlon.com', 'decathlon'],
  ['lenskart.com', 'lenskart'],
  ['meesho.com', 'meesho'],
  ['nykaafashion.com', 'nykaafashion'],
  ['nykaa.com', 'nykaafashion'],
  ['croma.com', 'croma'],
  ['jiomart.com', 'jiomart'],
  ['blinkit.com', 'blinkit'],
  ['bigbasket.com', 'bigbasket'],
];

export function detectPlatform(url: string): Platform | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    for (const [pattern, platform] of HOSTNAME_MAP) {
      if (hostname.includes(pattern)) return platform;
    }
    return null;
  } catch {
    return null;
  }
}
