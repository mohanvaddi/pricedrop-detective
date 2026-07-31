import * as cheerio from 'cheerio';

jest.mock('child_process', () => ({ execSync: jest.fn() }));
import { execSync } from 'child_process';
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

import { stripHtml, curlFetch, BaseScraper } from '../src/scraper/base';
import { CustomError } from '@pricedrop/shared/error';

// Concrete subclass to exercise the default (non-overridden) BaseScraper methods.
class BareScraper extends BaseScraper {
  extractPrice(): number {
    return 1;
  }
  extractTitle(): string | null {
    return 'x';
  }
}
const bare = new BareScraper();

describe('stripHtml', () => {
  it('removes tags, comments and named entities', () => {
    expect(stripHtml('<!-- hi --><b>Bold</b> &amp; clean')).toBe('Bold  clean');
  });
});

describe('BaseScraper.canonicalizeUrl (default)', () => {
  it('strips query string + fragment, keeping origin + path', () => {
    expect(bare.canonicalizeUrl('https://x.com/a/b?ref=1#frag')).toBe('https://x.com/a/b');
  });
  it('returns the input unchanged when it is not a URL', () => {
    expect(bare.canonicalizeUrl('not-a-url')).toBe('not-a-url');
  });
});

describe('BaseScraper.extractAvailability', () => {
  it('defaults to in-stock when there is no signal', () => {
    expect(bare.extractAvailability(cheerio.load('<html><body>hi</body></html>'))).toBe(true);
  });

  it('returns false on JSON-LD OutOfStock', () => {
    const html = `<script type="application/ld+json">{"offers":{"availability":"https://schema.org/OutOfStock"}}</script>`;
    expect(bare.extractAvailability(cheerio.load(html))).toBe(false);
  });

  it('returns true on JSON-LD InStock', () => {
    const html = `<script type="application/ld+json">{"offers":{"availability":"https://schema.org/InStock"}}</script>`;
    expect(bare.extractAvailability(cheerio.load(html))).toBe(true);
  });

  it('returns false on out-of-stock text signals', () => {
    expect(bare.extractAvailability(cheerio.load('<body>Currently unavailable</body>'))).toBe(false);
    expect(bare.extractAvailability(cheerio.load('<body>This item is Sold Out</body>'))).toBe(false);
  });
});

describe('BaseScraper.extractThumbnail (default)', () => {
  it('returns the og:image when present, else null', () => {
    const withOg = cheerio.load('<meta property="og:image" content="https://x.com/i.jpg">');
    expect(bare.extractThumbnail(withOg)).toBe('https://x.com/i.jpg');
    expect(bare.extractThumbnail(cheerio.load('<body></body>'))).toBeNull();
  });
});

describe('curlFetch', () => {
  it('returns the HTML body for a healthy page', () => {
    const html = '<html>' + 'x'.repeat(600) + '</html>';
    mockExecSync.mockReturnValue(html as unknown as ReturnType<typeof execSync>);
    expect(curlFetch('https://x.com')).toBe(html);
  });

  it('throws SessionExpired on a short WAF challenge body', () => {
    mockExecSync.mockReturnValue('Access Denied Reference #18.abc' as unknown as ReturnType<typeof execSync>);
    try {
      curlFetch('https://x.com');
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(CustomError);
      expect((e as CustomError<unknown>).name).toBe('SessionExpired');
    }
  });

  it('throws SessionExpired when the body is abnormally small', () => {
    mockExecSync.mockReturnValue('<html></html>' as unknown as ReturnType<typeof execSync>);
    expect(() => curlFetch('https://x.com')).toThrow('session cookies have expired');
  });
});
