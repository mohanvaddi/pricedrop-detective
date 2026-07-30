import { Platform } from './scraper';

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
