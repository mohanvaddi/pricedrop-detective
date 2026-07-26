import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import bot from './bots/telegram';
import { HttpStatusCode } from 'axios';
import { CustomError } from './constants/error';
import { getAllActiveProducts, checkPriceChange } from './src/services/tracker';
import { findSubscribersForProduct } from './src/db/subscriptions';
import { Product } from './constants/types';
import config from './config';
import authRouter from './src/api/routes/auth';
import productsRouter from './src/api/routes/products';
import subscriptionsRouter from './src/api/routes/subscriptions';

const REDDIT_ENABLED = Boolean(config.REDDIT_CLIENT_ID && config.REDDIT_USERNAME);

const app = express();
const PORT = process.env['PORT'] || 4000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/subscriptions', subscriptionsRouter);

app.get('/track', async (_req: Request, res: Response) => {
  const products = await getAllActiveProducts();

  if (products.length === 0) {
    return res.status(HttpStatusCode.BadRequest).json({ error: 'No active trackers.' });
  }

  res.status(HttpStatusCode.Ok).json({
    message: 'Scraping started.',
    data: { totalProducts: products.length },
  });

  startTrackers(products);
});

const startTrackers = (products: Product[]) => {
  products.forEach(async (product) => {
    const { url, website, id: productId, title } = product;

    try {
      const { currentPrice, recentPrice } = await checkPriceChange(product);
      const subscribers = await findSubscribersForProduct(productId);

      for (const { user_id: _userId, alert_price, channel, channel_id } of subscribers) {
        if (alert_price !== null && currentPrice > alert_price) continue;

        const isPriceDrop = currentPrice < recentPrice;
        const emoji = isPriceDrop ? '📉' : '📈';
        const changePct = (Math.abs((currentPrice - recentPrice) / recentPrice) * 100).toFixed(2);
        const direction = isPriceDrop ? 'dropped' : 'increased';
        const priceMessage = `${emoji} ${title ? title + '\n' : ''}Price ${direction} from ₹${recentPrice} to ₹${currentPrice} (${changePct}%)\n${url}`;

        if (channel === 'telegram' && typeof channel_id === 'string') {
          await bot.api.sendMessage(
            parseInt(channel_id, 10),
            `${emoji} ${title ? title + '\n' : ''}Price ${direction} from ₹${recentPrice} to ₹${currentPrice} (${changePct}%)\n<a href="${url}">View product</a>`,
            {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: 'View on ' + website.charAt(0).toUpperCase() + website.slice(1), url }],
                ],
              },
            },
          );
        } else if (channel === 'reddit' && REDDIT_ENABLED) {
          const { sendPriceAlert } = await import('./bots/reddit');
          await sendPriceAlert(String(channel_id), priceMessage).catch(() => undefined);
        }
        // web: future email notification
      }
    } catch (error) {
      if (error instanceof CustomError) {
        if (error.name === 'PriceNotChanged') return;
        const subscribers = await findSubscribersForProduct(productId).catch(() => []);
        for (const { channel, channel_id } of subscribers) {
          if (channel === 'telegram' && typeof channel_id === 'string') {
            await bot.api
              .sendMessage(
                parseInt(channel_id, 10),
                `⚠️ ID: ${productId}\nError: ${(error as CustomError<unknown>).message}\nIf this persists, recreate the tracker with a new URL.`,
                {
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: 'View on ' + website.charAt(0).toUpperCase() + website.slice(1), url }],
                    ],
                  },
                },
              )
              .catch(() => undefined);
          }
        }
        return;
      }
      console.error(error);
    }
  });
};

app.listen(PORT, async () => {
  console.log(`Server running on port::${PORT} 🚀`);
  await bot
    .start({
      onStart: () => console.log('Bot initialized'),
      drop_pending_updates: true,
    })
    .catch((error: unknown) => {
      throw new Error('Unable to init Bot:: ' + JSON.stringify(error));
    });

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

  // Serve web UI in production
  const webDist = path.join(__dirname, 'web', 'dist');
  app.use(express.static(webDist));
  app.get('*', (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
});
