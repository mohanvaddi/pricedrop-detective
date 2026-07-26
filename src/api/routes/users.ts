import { Router, Response } from 'express';
import { pool } from '../../db/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

/** GET /api/users/me — profile + linked channels */
router.get('/me', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows: webRows } = await pool.query<{ email: string; display_name: string | null }>(
      'SELECT email, display_name FROM web_users WHERE user_id = $1',
      [req.userId],
    );
    const { rows: telegramRows } = await pool.query<{ telegram_id: number; username: string }>(
      'SELECT telegram_id, username FROM telegram_users WHERE user_id = $1',
      [req.userId],
    );
    const { rows: redditRows } = await pool.query<{ reddit_username: string }>(
      'SELECT reddit_username FROM reddit_users WHERE user_id = $1',
      [req.userId],
    );

    res.json({
      data: {
        email: webRows[0]?.email ?? null,
        display_name: webRows[0]?.display_name ?? null,
        channels: {
          telegram: telegramRows[0] ?? null,
          reddit: redditRows[0] ?? null,
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
    await pool.query('UPDATE web_users SET display_name = $1 WHERE user_id = $2', [display_name.trim(), req.userId]);
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
    await pool.query(
      'INSERT INTO telegram_users (user_id, telegram_id) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET telegram_id = EXCLUDED.telegram_id',
      [req.userId, telegram_id],
    );
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
    await pool.query('DELETE FROM telegram_users WHERE user_id = $1', [req.userId]);
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
    await pool.query(
      'INSERT INTO reddit_users (user_id, reddit_username) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET reddit_username = EXCLUDED.reddit_username',
      [req.userId, reddit_username.trim()],
    );
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
    await pool.query('DELETE FROM reddit_users WHERE user_id = $1', [req.userId]);
    res.status(204).end();
  } catch (error) {
    console.error('[api/users] reddit unlink error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export { router as usersRouter };
