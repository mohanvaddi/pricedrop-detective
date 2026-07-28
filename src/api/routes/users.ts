import { Router, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { webUsers, telegramUsers, redditUsers } from '../../db/schema';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

/** GET /api/users/me — profile + linked channels */
router.get('/me', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const webRow = await db
      .select({ email: webUsers.email, displayName: webUsers.displayName })
      .from(webUsers)
      .where(eq(webUsers.userId, req.userId!));
    const telegramRow = await db
      .select({ telegramId: telegramUsers.telegramId, username: telegramUsers.username })
      .from(telegramUsers)
      .where(eq(telegramUsers.userId, req.userId!));
    const redditRow = await db
      .select({ redditUsername: redditUsers.redditUsername })
      .from(redditUsers)
      .where(eq(redditUsers.userId, req.userId!));

    res.json({
      data: {
        email: webRow[0]?.email ?? null,
        display_name: webRow[0]?.displayName ?? null,
        channels: {
          telegram: telegramRow[0] ?? null,
          reddit: redditRow[0] ?? null,
        },
      },
    });
  } catch (error) {
    console.error('[api/users] me error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/** PATCH /api/users/me — update display name */
router.patch('/me', async (req: AuthRequest, res: Response): Promise<void> => {
  const { display_name } = req.body as { display_name?: string };
  if (typeof display_name !== 'string' || !display_name.trim()) {
    res.status(400).json({ error: 'display_name must be a non-empty string.' });
    return;
  }
  try {
    await db
      .update(webUsers)
      .set({ displayName: display_name.trim() })
      .where(eq(webUsers.userId, req.userId!));
    res.json({ message: 'Profile updated.' });
  } catch (error) {
    console.error('[api/users] patch me error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/** POST /api/users/me/channels/telegram — link a Telegram ID */
router.post('/me/channels/telegram', async (req: AuthRequest, res: Response): Promise<void> => {
  const { telegram_id } = req.body as { telegram_id?: number };
  if (!telegram_id || typeof telegram_id !== 'number') {
    res.status(400).json({ error: 'telegram_id must be a number.' });
    return;
  }
  try {
    await db
      .insert(telegramUsers)
      .values({ userId: req.userId!, telegramId: telegram_id, username: '' })
      .onConflictDoUpdate({
        target: telegramUsers.userId,
        set: { telegramId: telegram_id },
      });
    res.json({ message: 'Telegram linked.' });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'This Telegram ID is already linked to another account.' });
    } else {
      console.error('[api/users] telegram link error:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
});

/** DELETE /api/users/me/channels/telegram — unlink Telegram */
router.delete('/me/channels/telegram', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await db.delete(telegramUsers).where(eq(telegramUsers.userId, req.userId!));
    res.status(204).end();
  } catch (error) {
    console.error('[api/users] telegram unlink error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/** POST /api/users/me/channels/reddit — link a Reddit username */
router.post('/me/channels/reddit', async (req: AuthRequest, res: Response): Promise<void> => {
  const { reddit_username } = req.body as { reddit_username?: string };
  if (!reddit_username || typeof reddit_username !== 'string' || !reddit_username.trim()) {
    res.status(400).json({ error: 'reddit_username must be a non-empty string.' });
    return;
  }
  try {
    await db
      .insert(redditUsers)
      .values({ userId: req.userId!, redditUsername: reddit_username.trim() })
      .onConflictDoUpdate({
        target: redditUsers.userId,
        set: { redditUsername: reddit_username.trim() },
      });
    res.json({ message: 'Reddit linked.' });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'This Reddit username is already linked to another account.' });
    } else {
      console.error('[api/users] reddit link error:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
});

/** DELETE /api/users/me/channels/reddit — unlink Reddit */
router.delete('/me/channels/reddit', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await db.delete(redditUsers).where(eq(redditUsers.userId, req.userId!));
    res.status(204).end();
  } catch (error) {
    console.error('[api/users] reddit unlink error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export { router as usersRouter };
