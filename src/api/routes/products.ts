import { Router, Request, Response } from 'express';
import { findAllActiveProducts, findProduct } from '../../db/products';
import { findPricesByProduct } from '../../db/prices';

const router = Router();

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await findAllActiveProducts();
    res.json({ data: products });
  } catch (error) {
    console.error('[api/products] list error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await findProduct(req.params['id']! as string);
    if (!product) { res.status(404).json({ error: 'Product not found.' }); return; }
    res.json({ data: product });
  } catch (error) {
    console.error('[api/products] get error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/:id/prices', async (req: Request, res: Response): Promise<void> => {
  try {
    const prices = await findPricesByProduct(req.params['id']! as string);
    res.json({ data: prices });
  } catch (error) {
    console.error('[api/products] prices error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
