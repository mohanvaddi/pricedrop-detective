import type { Cookie } from 'playwright';
import { getScraperSession, upsertScraperSession, deleteScraperSession } from '@pricedrop/shared/db/sessions';
import { renderWithSession } from './browser';
import { createLogger } from '../logger';

const log = createLogger('session');

export interface PlatformSessionConfig {
  /** URLs to visit (in order) before extracting. `target` is the product URL. */
  seedUrls: (targetUrl: string) => string[];
  /** Only cookies whose domain contains this string are persisted. */
  cookieDomain: string;
  /** How long a stored session is reused before a proactive refresh. */
  ttlMs: number;
  /** JS expression polled until the product data has hydrated (best-effort). */
  readyExpression?: string;
}

const CONFIGS: Record<string, PlatformSessionConfig> = {
  ajio: {
    seedUrls: (target) => ['https://www.ajio.com', target],
    cookieDomain: 'ajio.com',
    ttlMs: 6 * 60 * 60 * 1000, // 6 hours
    readyExpression:
      '!!(window.__PRELOADED_STATE__ && window.__PRELOADED_STATE__.product && window.__PRELOADED_STATE__.product.productDetails && window.__PRELOADED_STATE__.product.productDetails.price)',
  },
};

/** A rendered page looks blocked when it is a WAF wall or an empty shell. */
function looksBlocked(html: string): boolean {
  return /Access Denied|Pardon Our Interruption|Request unsuccessful/i.test(html) || html.trim().length < 5000;
}

/**
 * Session-based scraping engine ("3rd scraping type").
 *
 * AJIO's Akamai blocks bare HTTP fetches (even the browser's own request API is
 * 403'd), so pages must be navigated in Camoufox. To keep this cheap we persist
 * the solved cookie set in Postgres and inject it into fresh contexts so Akamai
 * need not be re-solved on every scrape. Cookies are refreshed after each render
 * and dropped (forcing a fresh solve) if a render comes back blocked.
 */
export class SessionManager {
  private config(platform: string): PlatformSessionConfig {
    const cfg = CONFIGS[platform];
    if (!cfg) throw new Error(`No session config registered for platform "${platform}"`);
    return cfg;
  }

  /** Render the target URL, reusing/refreshing the stored session. Returns HTML. */
  async render(platform: string, targetUrl: string): Promise<string> {
    const cfg = this.config(platform);
    const stored = await getScraperSession(platform);
    const injectCookies = stored && !this.isExpired(stored.expiresAt) ? this.parseCookies(stored.cookie) : undefined;

    if (injectCookies) log.info(`${platform}: reusing stored session (${injectCookies.length} cookies)`);
    else log.info(`${platform}: no valid stored session — solving fresh`);

    let result = await renderWithSession({
      seedUrls: cfg.seedUrls(targetUrl),
      cookieDomain: cfg.cookieDomain,
      injectCookies,
      readyExpression: cfg.readyExpression,
    });

    // If reused cookies produced a blocked page, drop them and solve fresh once.
    if (looksBlocked(result.html) && injectCookies) {
      log.info(`${platform}: reused session blocked — re-solving fresh`);
      await deleteScraperSession(platform);
      result = await renderWithSession({
        seedUrls: cfg.seedUrls(targetUrl),
        cookieDomain: cfg.cookieDomain,
        readyExpression: cfg.readyExpression,
      });
    }

    if (!looksBlocked(result.html) && result.cookies.length) {
      await upsertScraperSession({
        platform,
        cookie: JSON.stringify(result.cookies),
        userAgent: result.userAgent,
        expiresAt: new Date(Date.now() + cfg.ttlMs),
      });
    }

    return result.html;
  }

  private parseCookies(raw: string): Cookie[] | undefined {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length ? (parsed as Cookie[]) : undefined;
    } catch {
      return undefined; // legacy/curl-string rows — ignore and re-solve
    }
  }

  private isExpired(expiresAt: Date | null): boolean {
    return expiresAt ? expiresAt.getTime() <= Date.now() : false;
  }
}

export const sessionManager = new SessionManager();
