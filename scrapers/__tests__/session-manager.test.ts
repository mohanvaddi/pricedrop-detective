jest.mock('@pricedrop/shared/db/sessions', () => ({
  getScraperSession: jest.fn(),
  upsertScraperSession: jest.fn(),
  deleteScraperSession: jest.fn(),
}));
jest.mock('../src/scraper/browser', () => ({ renderWithSession: jest.fn() }));

import { getScraperSession, upsertScraperSession, deleteScraperSession } from '@pricedrop/shared/db/sessions';
import { renderWithSession } from '../src/scraper/browser';
import { SessionManager } from '../src/scraper/session-manager';

const mockGet = getScraperSession as jest.Mock;
const mockUpsert = upsertScraperSession as jest.Mock;
const mockDelete = deleteScraperSession as jest.Mock;
const mockRender = renderWithSession as jest.Mock;

const GOOD_HTML = '<html>' + 'x'.repeat(6000) + '</html>';
const BLOCKED_HTML = 'Access Denied';
const COOKIES = [{ name: 'ak', value: '1', domain: '.ajio.com' }];

const mgr = new SessionManager();

describe('SessionManager.render', () => {
  it('throws for an unregistered platform', async () => {
    await expect(mgr.render('nope', 'https://x')).rejects.toThrow(/No session config/);
  });

  it('solves fresh when there is no stored session, then upserts it', async () => {
    mockGet.mockResolvedValue(null);
    mockRender.mockResolvedValue({ html: GOOD_HTML, cookies: COOKIES, userAgent: 'UA' });

    const html = await mgr.render('ajio', 'https://www.ajio.com/x/p/1');

    expect(html).toBe(GOOD_HTML);
    expect(mockRender).toHaveBeenCalledTimes(1);
    // solved fresh → no injectCookies passed
    expect(mockRender.mock.calls[0][0].injectCookies).toBeUndefined();
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('reuses valid stored cookies without deleting them', async () => {
    mockGet.mockResolvedValue({ cookie: JSON.stringify(COOKIES), expiresAt: new Date(Date.now() + 60_000) });
    mockRender.mockResolvedValue({ html: GOOD_HTML, cookies: COOKIES, userAgent: 'UA' });

    await mgr.render('ajio', 'https://www.ajio.com/x/p/1');

    expect(mockRender.mock.calls[0][0].injectCookies).toHaveLength(1);
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it('drops expired cookies and solves fresh', async () => {
    mockGet.mockResolvedValue({ cookie: JSON.stringify(COOKIES), expiresAt: new Date(Date.now() - 60_000) });
    mockRender.mockResolvedValue({ html: GOOD_HTML, cookies: COOKIES, userAgent: 'UA' });

    await mgr.render('ajio', 'https://www.ajio.com/x/p/1');

    expect(mockRender.mock.calls[0][0].injectCookies).toBeUndefined();
  });

  it('deletes and re-solves once when reused cookies produce a blocked page', async () => {
    mockGet.mockResolvedValue({ cookie: JSON.stringify(COOKIES), expiresAt: new Date(Date.now() + 60_000) });
    mockRender
      .mockResolvedValueOnce({ html: BLOCKED_HTML, cookies: COOKIES, userAgent: 'UA' })
      .mockResolvedValueOnce({ html: GOOD_HTML, cookies: COOKIES, userAgent: 'UA' });

    const html = await mgr.render('ajio', 'https://www.ajio.com/x/p/1');

    expect(mockDelete).toHaveBeenCalledWith('ajio');
    expect(mockRender).toHaveBeenCalledTimes(2);
    expect(html).toBe(GOOD_HTML);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it('does not upsert when the final render is still blocked', async () => {
    mockGet.mockResolvedValue(null);
    mockRender.mockResolvedValue({ html: BLOCKED_HTML, cookies: COOKIES, userAgent: 'UA' });

    await mgr.render('ajio', 'https://www.ajio.com/x/p/1');

    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('ignores legacy non-JSON cookie rows and solves fresh', async () => {
    mockGet.mockResolvedValue({ cookie: 'ak_bmsc=legacy; curl-string', expiresAt: new Date(Date.now() + 60_000) });
    mockRender.mockResolvedValue({ html: GOOD_HTML, cookies: COOKIES, userAgent: 'UA' });

    await mgr.render('ajio', 'https://www.ajio.com/x/p/1');

    expect(mockRender.mock.calls[0][0].injectCookies).toBeUndefined();
  });
});
