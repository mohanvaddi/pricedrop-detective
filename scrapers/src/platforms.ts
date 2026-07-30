import selectorsConfig from './scraper/selectors.json';
import type { Platform } from './scraper';

/** Human-readable display names for each supported platform. */
export const PLATFORM_NAMES: Record<Platform, string> = {
  amazon: 'Amazon',
  flipkart: 'Flipkart',
  myntra: 'Myntra',
  ajio: 'Ajio',
  tatacliq: 'Tata CLiQ',
  ikea: 'IKEA',
  decathlon: 'Decathlon',
  lenskart: 'Lenskart',
  meesho: 'Meesho',
  nykaafashion: 'Nykaa Fashion',
  croma: 'Croma',
  jiomart: 'JioMart',
  blinkit: 'Blinkit',
  bigbasket: 'BigBasket',
};

export interface PlatformInfo {
  id: string;
  name: string;
  fetchMethod: string;
}

/** Supported platforms with display name + fetch method. Source of truth for the UI. */
export function listPlatforms(): PlatformInfo[] {
  return (Object.entries(selectorsConfig) as Array<[Platform, { fetchMethod?: string }]>).map(([id, cfg]) => ({
    id,
    name: PLATFORM_NAMES[id] ?? id.charAt(0).toUpperCase() + id.slice(1),
    fetchMethod: cfg.fetchMethod ?? 'axios',
  }));
}
