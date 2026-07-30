import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

const SCRAPER_URL = process.env['SCRAPER_URL'] ?? 'http://localhost:5001';

// Proxies the supported-platform list from the scrapers service, which is the
// source of truth for platforms and their fetch methods.
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const { data } = await axios.get<{ data: unknown[] }>(`${SCRAPER_URL}/platforms`, { timeout: 15_000 });
    res.json({ data: data.data });
  } catch (error) {
    console.error('[api/platforms] proxy error:', error);
    res.status(502).json({ error: 'Unable to reach scrapers service.' });
  }
});

export default router;
