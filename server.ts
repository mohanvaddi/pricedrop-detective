import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import bot from './bot';
import { HttpStatusCode } from 'axios';
import { CustomError } from './lib/custom.error';
import { getAllTrackers, checkPriceChange } from './services/tracker.service';
import { Tracker } from './types/main';

const app = express();
const PORT = process.env['PORT'] || 4000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/track', async (_req: Request, res: Response) => {
  const trackers = await getAllTrackers();

  if (trackers.length === 0) {
    return res.status(HttpStatusCode.BadRequest).json({ error: 'No trackers available.' });
  }

  res.status(HttpStatusCode.Ok).json({
    message: 'Scraping started.',
    data: { totalTrackers: trackers.length },
  });

  startTrackers(trackers);
});

const startTrackers = (trackers: Tracker[]) => {
  trackers.forEach(async (tracker) => {
    const { url, website, id: hash, user, title } = tracker;

    try {
      const { currentPrice, recentPrice } = await checkPriceChange(tracker);
      const isPriceDrop = currentPrice < recentPrice;
      const emoji = isPriceDrop ? '📉' : '📈';
      const changePct = (Math.abs((currentPrice - recentPrice) / recentPrice) * 100).toFixed(2);
      const direction = isPriceDrop ? 'dropped' : 'increased';

      await bot.api.sendMessage(
        user,
        `${emoji} ${title ? title + '\n' : ''}Price ${direction} from ₹${recentPrice} to ₹${currentPrice} (${changePct}%)\n<a href="${url}">View product</a>`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: 'View on ' + website.charAt(0).toUpperCase() + website.slice(1), url }],
            ],
          },
        }
      );
    } catch (error) {
      if (error instanceof CustomError) {
        if (error.name === 'PriceNotChanged' || error.name === 'AlertThresholdNotMet') return;
        return bot.api.sendMessage(
          user,
          `⚠️ ID: ${hash}\nError: ${error.message}\nIf this persists, recreate the tracker with a new URL.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'View on ' + website.charAt(0).toUpperCase() + website.slice(1), url }],
              ],
            },
          }
        );
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
});
