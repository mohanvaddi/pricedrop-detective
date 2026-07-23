import { Router, Request, Response } from 'express';
import { HttpStatusCode } from 'axios';
import { getAllTrackers, checkPriceChange } from '../services/tracker.service';
import { CustomError } from '../lib/custom.error';
import bot from '../bot';

const router = Router();

router.get('/track', async (_req: Request, res: Response) => {
  const trackers = await getAllTrackers();

  if (trackers.length === 0) {
    res.status(HttpStatusCode.BadRequest).json({ error: 'No trackers available.' });
    return;
  }

  res.status(HttpStatusCode.Ok).json({ message: 'Scraping started.', data: { totalTrackers: trackers.length } });

  for (const tracker of trackers) {
    const { url, website, id: hash, user, title } = tracker;
    try {
      const { currentPrice, recentPrice } = await checkPriceChange(tracker);
      const pctChange = (((currentPrice - recentPrice) / recentPrice) * 100).toFixed(2);
      const siteName = website.charAt(0).toUpperCase() + website.slice(1);

      await bot.api.sendMessage(
        user,
        `🚨 ${title ? title + '\n' : ''}Price changed from ${recentPrice} to ${currentPrice}\n<a href="${url}">This</a> product's price has changed by ${pctChange}%`,
        {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [[{ text: siteName, url }]] },
        }
      );
    } catch (error) {
      if (error instanceof CustomError) {
        if (error.name !== 'PriceNotChanged') {
          const siteName = website.charAt(0).toUpperCase() + website.slice(1);
          await bot.api.sendMessage(
            user,
            `Hash: ${hash}\nError: ${error.message}\nIf this error persists, recreate the tracker with a new working URL.`,
            { reply_markup: { inline_keyboard: [[{ text: 'View on ' + siteName, url }]] } }
          );
        }
        continue;
      }
      console.error(error);
    }
  }
});

export default router;
