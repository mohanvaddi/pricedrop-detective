import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import TrackerUtils from './utils/tracker.utils';
import bot from './bot';
import { HttpStatusCode } from 'axios';
import { CustomError } from './lib/custom.error';
import SupabaseUtils from './utils/supabse.utils';
import { Tracker } from './types/main';

const app = express();
const PORT = process.env['PORT'] || 4000;

// middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const supabase = new SupabaseUtils();
const trackerUtils = new TrackerUtils();
app.get('/track', [
  async (_req: Request, res: Response) => {
    const trackers = await supabase.fetchTrackers();

    if (trackers.length === 0) {
      return res.status(HttpStatusCode.BadRequest).send({
        error: 'No Trackers are available.',
      });
    }

    res.status(HttpStatusCode.Ok).json({
      message: 'scraping started.',
      data: {
        totalTrackers: trackers.length,
      },
    });

    startTrackers(trackers);
  },
]);

const startTrackers = (trackers: Tracker[]) => {
  trackers.forEach(async (tracker) => {
    const { url, website, id: hash, user, title } = tracker;

    try {
      const { currentPrice, recentPrice } = await trackerUtils.track(tracker);
      await bot.api.sendMessage(
        user,
        `🚨 ${
          title ? title + '\n' : ''
        }Price changed from ${recentPrice} to ${currentPrice}\n<a href="${url}">This</a> product's price has changed by ${(
          +((currentPrice - recentPrice) / recentPrice) * 100
        ).toFixed(2)}%`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: <string>website.charAt(0).toUpperCase() + website.slice(1),
                  url: url,
                },
              ],
            ],
          },
        }
      );
    } catch (error) {
      if (error instanceof CustomError) {
        if (error.name !== 'PriceNotChanged') {
          return bot.api.sendMessage(
            user,
            `Hash: ${hash}\nError: ${error.message}\nif this error persists recreate tracker using a new working url.`
          );
        }
      }
      return console.error(error);
    }
  });
};

app.listen(PORT, async () => {
  console.log(`Server running on port::${PORT} 🚀`);
  await bot
    .start({
      onStart: () => {
        console.log('Bot Initialized');
      },
      drop_pending_updates: true,
    })
    .catch((error: unknown) => {
      throw new Error('Unable to init Bot:: ' + JSON.stringify(error));
    });
});
