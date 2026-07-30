import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import bot from './bots/telegram';
import config from './config';
import authRouter from './src/api/routes/auth';
import productsRouter from './src/api/routes/products';
import subscriptionsRouter from './src/api/routes/subscriptions';
import { usersRouter } from './src/api/routes/users';
import platformsRouter from './src/api/routes/platforms';
import listsRouter from './src/api/routes/lists';
import { startNotificationPoller } from './src/services/notifier';

const REDDIT_ENABLED = Boolean(config.REDDIT_CLIENT_ID && config.REDDIT_USERNAME);

const app = express();
const PORT = process.env['PORT'] || 4000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/users', usersRouter);
app.use('/api/platforms', platformsRouter);
app.use('/api/lists', listsRouter);

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

app.listen(PORT, async () => {
  console.log(`Server running on port::${PORT} 🚀`);
  if (bot) {
    await bot
      .start({
        onStart: () => console.log('Bot initialized'),
        drop_pending_updates: true,
      })
      .catch((error: unknown) => {
        throw new Error('Unable to init Bot:: ' + JSON.stringify(error));
      });
  } else {
    console.log('Telegram bot disabled (TELEGRAM_BOT_TOKEN not set)');
  }

  if (REDDIT_ENABLED) {
    const { processDMs } = await import('./bots/reddit');
    // Poll Reddit DMs every 60 seconds
    const REDDIT_POLL_INTERVAL_MS = 60_000;
    const poll = async () => {
      try { await processDMs(); } catch (e) { console.error('[reddit] Poll error:', e); }
    };
    await poll();
    setInterval(() => { void poll(); }, REDDIT_POLL_INTERVAL_MS);
    console.log('Reddit bot initialized (polling every 60s)');
  }

  // Drain the notification_queue outbox filled by the scrapers worker and
  // deliver Telegram/Reddit messages.
  startNotificationPoller();

  // Serve web UI only when the build artefact is present (i.e. inside Docker).
  // In dev the Vite dev server handles the frontend separately.
  const webDist = path.join(__dirname, '..', 'web', 'dist');
  const fs = await import('fs');
  if (fs.existsSync(webDist)) {
    app.use(express.static(webDist));
    // Express 5 requires a named wildcard parameter instead of bare '*'
    app.get('/*splat', (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
  }
});
