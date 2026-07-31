import type { Browser, Cookie, Page } from 'playwright';

/**
 * Camoufox launcher — a stealth-hardened Firefox fork with binary-level
 * anti-fingerprinting (canvas/webgl/navigator spoofing, human cursor movement).
 * Replaces raw Playwright Chromium for all browser-based scraping.
 *
 * Run mode is controlled by CAMOUFOX_HEADLESS:
 *   - unset / "virtual" -> headed Firefox on an Xvfb virtual display (max stealth,
 *     requires the `xvfb` binary; camoufox-js spawns/tears down Xvfb itself)
 *   - "true"            -> pure headless (lighter; use where Xvfb is unavailable)
 *   - "false"           -> headed on the real display (local debugging)
 */
function resolveHeadless(): boolean | 'virtual' {
  const v = process.env['CAMOUFOX_HEADLESS']?.toLowerCase();
  if (v === 'true') return true;
  if (v === 'false') return false;
  return 'virtual';
}

/**
 * Launch a stealth Camoufox browser. Camoufox owns the fingerprint (user-agent,
 * locale surface, navigator props) so contexts should stay minimal — do NOT
 * override userAgent, otherwise the spoof becomes inconsistent and detectable.
 */
export async function launchCamoufox(): Promise<Browser> {
  // Loaded lazily: camoufox-js is ESM and heavy; keeping it out of the static
  // import graph lets the (browser-free) scraper tests run under Jest/CJS.
  const { Camoufox } = await import('camoufox-js');
  const browser = await Camoufox({
    headless: resolveHeadless(),
    humanize: true, // human-like cursor movement
    locale: 'en-IN',
    os: ['windows', 'macos'],
  });
  return browser as unknown as Browser;
}

export interface SessionRenderOptions {
  /** URLs to visit in order before extracting (e.g. [home, product]). */
  seedUrls: string[];
  /** Restrict the returned cookies to this domain substring. */
  cookieDomain?: string | undefined;
  /** Previously-solved cookies to inject so Akamai need not be re-solved. */
  injectCookies?: Cookie[] | undefined;
  /** JS expression polled via waitForFunction until the product data is ready. */
  readyExpression?: string | undefined;
}

export interface SessionRenderResult {
  html: string;
  cookies: Cookie[];
  userAgent: string;
}

/**
 * Render a page in Camoufox reusing (and refreshing) a WAF session.
 *
 * Akamai Bot Manager sites (e.g. AJIO) reject bare HTTP fetches — even the
 * browser's own request API is 403'd — so the product page must be *navigated*
 * in a real browser. To keep this cheap we inject a previously-solved cookie set
 * so Akamai's `_abck` is already valid and no re-solve is needed; when it isn't
 * (first run or expired) we simulate human activity until `_abck` reaches its
 * solved (`~0~`) state. The (possibly refreshed) cookies are returned for reuse.
 */
export async function renderWithSession(opts: SessionRenderOptions): Promise<SessionRenderResult> {
  if (opts.seedUrls.length === 0) throw new Error('renderWithSession requires at least one URL');
  const browser = await launchCamoufox();
  try {
    const context = await browser.newContext();
    if (opts.injectCookies?.length) {
      await context.addCookies(opts.injectCookies).catch(() => undefined);
    }
    const page = await context.newPage();
    for (const url of opts.seedUrls) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    }

    await solveAkamai(context, page);

    if (opts.readyExpression) {
      // Wait for the SPA to hydrate the product data (best-effort).
      await page.waitForFunction(opts.readyExpression, { timeout: 30000 }).catch(() => undefined);
    }

    const html = await page.content();
    const userAgent = await page.evaluate(() => navigator.userAgent);
    const all = await context.cookies();
    const cookies = opts.cookieDomain ? all.filter((c) => c.domain.includes(opts.cookieDomain!)) : all;
    return { html, cookies, userAgent };
  } finally {
    await browser.close();
  }
}

/**
 * Drive Akamai's `_abck` cookie to its solved (`~0~`) state by simulating human
 * mouse/scroll activity. Exits immediately when there is no `_abck` or it is
 * already solved (the common case when valid cookies were injected).
 */
async function solveAkamai(context: import('playwright').BrowserContext, page: Page): Promise<void> {
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    const abck = (await context.cookies()).find((c) => c.name === '_abck')?.value;
    if (!abck || isAbckSolved(abck)) return;
    await simulateHumanActivity(page);
    await page.waitForTimeout(1500);
  }
}

/** Akamai `_abck` is solved when the state segment (`~<state>~`) is not `-1`. */
function isAbckSolved(abck: string): boolean {
  const parts = abck.split('~');
  return parts.length > 1 && parts[1] !== '-1';
}

/** Nudge the Akamai sensor with human-like mouse movement and scrolling. */
async function simulateHumanActivity(page: Page): Promise<void> {
  try {
    for (let i = 0; i < 3; i++) {
      await page.mouse.move(200 + Math.random() * 800, 150 + Math.random() * 500, { steps: 6 });
      await page.mouse.wheel(0, 300 + Math.random() * 500);
      await page.waitForTimeout(600 + Math.random() * 700);
    }
  } catch {
    // Best-effort — never let activity simulation abort a render.
  }
}
