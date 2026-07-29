import { Router, Request, Response } from 'express';
import selectorsConfig from '../../scraper/selectors.json';

const router = Router();

const PLATFORM_NAMES: Record<string, string> = {
  amazon: 'Amazon',
  flipkart: 'Flipkart',
  myntra: 'Myntra',
  ajio: 'Ajio',
  tatacliq: 'Tata CLiQ',
};

router.get('/', (_req: Request, res: Response): void => {
  const platforms = Object.entries(selectorsConfig).map(([id, cfg]) => ({
    id,
    name: PLATFORM_NAMES[id] ?? id.charAt(0).toUpperCase() + id.slice(1),
    fetchMethod: (cfg as { fetchMethod?: string }).fetchMethod ?? 'axios',
  }));

  res.json({ data: platforms });
});

export default router;
