import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createTracker, removeTracker, getTrackersByUser, setTrackerAlert } from '../../services/tracker';
import { NewTrackerDTO } from '../../constants/schema';
import { CustomError } from '../../../constants/error';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const trackers = await getTrackersByUser(req.userId!);
    res.json({ data: trackers });
  } catch (error) {
    console.error('[api/subscriptions] list error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const input = NewTrackerDTO.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: input.error.issues[0]!.message });
    return;
  }
  try {
    const { hash, currentPrice } = await createTracker(req.userId!, input.data);
    res.status(201).json({ data: { hash, currentPrice } });
  } catch (error) {
    if (error instanceof CustomError) {
      const status = error.name === 'TrackerExists' ? 409 : error.name === 'TrackerLimitReached' ? 429 : 400;
      res.status(status).json({ error: error.message });
    } else {
      console.error('[api/subscriptions] create error:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
});

router.delete('/:productId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await removeTracker(req.params['productId']! as string, req.userId!);
    res.status(204).end();
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('[api/subscriptions] delete error:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
});

router.patch('/:productId/alert', async (req: AuthRequest, res: Response): Promise<void> => {
  const { alertPrice } = req.body as { alertPrice?: number | null };
  try {
    await setTrackerAlert(req.params['productId']! as string, req.userId!, alertPrice ?? null);
    res.status(200).json({ message: 'Alert price updated.' });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('[api/subscriptions] alert error:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
});

export default router;
