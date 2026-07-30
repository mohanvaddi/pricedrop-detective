import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createTracker, removeTracker, getTrackersByUser, setTrackerAlert } from '../../services/tracker';
import { getTrackersByList, assignToList } from '../../services/lists';
import { findSubscription } from '@pricedrop/shared/db/subscriptions';
import { NewTrackerDTO } from '../../constants/schema';
import { CustomError } from '@pricedrop/shared/error';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listId = req.query['listId'] as string | undefined;
    let trackers;
    if (listId) {
      trackers = await getTrackersByList(req.userId!, listId);
    } else {
      trackers = await getTrackersByUser(req.userId!);
    }
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
  const { listId } = req.body as { listId?: string };
  try {
    const { hash, currentPrice } = await createTracker(req.userId!, input.data);
    // Assign to a list if specified
    if (listId) {
      const sub = await findSubscription(req.userId!, hash);
      if (sub) await assignToList(sub.id, listId);
    }
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
  const { alertPrice, notifyEveryChange, listId } = req.body as {
    alertPrice?: number | null;
    notifyEveryChange?: boolean;
    listId?: string | null;
  };
  try {
    await setTrackerAlert(req.params['productId']! as string, req.userId!, alertPrice ?? null, notifyEveryChange);
    // Update list assignment if provided
    if (listId !== undefined) {
      const sub = await findSubscription(req.userId!, req.params['productId'] as string);
      if (sub) await assignToList(sub.id, listId);
    }
    res.status(200).json({ message: 'Alert updated.' });
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
