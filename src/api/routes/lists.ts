import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getListsByUser, createList, updateListSettings, deleteList, getPublicList } from '../../services/lists';
import { CustomError } from '../../../constants/error';

const router = Router();

// --- Public route (no auth) ---
router.get('/:listId/public', async (req: Request, res: Response): Promise<void> => {
  try {
    const listId = req.params['listId'] as string;
    const data = await getPublicList(listId);
    if (!data) {
      res.status(404).json({ error: 'List not found or is private.' });
      return;
    }
    res.json({ data });
  } catch (error) {
    console.error('[api/lists] public list error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- Authenticated routes ---
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const lists = await getListsByUser(req.userId!);
    res.json({ data: lists });
  } catch (error) {
    console.error('[api/lists] list error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { name } = req.body as { name?: string };
  if (!name || !name.trim()) {
    res.status(400).json({ error: 'List name is required.' });
    return;
  }
  try {
    const list = await createList(req.userId!, name);
    res.status(201).json({ data: list });
  } catch (error) {
    if (error instanceof CustomError) {
      const status = error.name === 'ListLimitReached' ? 429 : error.name === 'ListNameTaken' ? 409 : 400;
      res.status(status).json({ error: error.message });
    } else {
      console.error('[api/lists] create error:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
});

router.patch('/:listId', async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, isPublic } = req.body as { name?: string; isPublic?: boolean };
  if (!name?.trim() && isPublic === undefined) {
    res.status(400).json({ error: 'Nothing to update.' });
    return;
  }
  try {
    const data: { name?: string; isPublic?: boolean } = {};
    if (name) data.name = name;
    if (isPublic !== undefined) data.isPublic = isPublic;
    await updateListSettings(req.userId!, req.params['listId'] as string, data);
    res.status(200).json({ message: 'List updated.' });
  } catch (error) {
    if (error instanceof CustomError) {
      const status = error.name === 'ListNotFound' ? 404 : error.name === 'ListNameTaken' ? 409 : 400;
      res.status(status).json({ error: error.message });
    } else {
      console.error('[api/lists] update error:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
});

router.delete('/:listId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await deleteList(req.userId!, req.params['listId'] as string);
    res.status(204).end();
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('[api/lists] delete error:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
});

export default router;
