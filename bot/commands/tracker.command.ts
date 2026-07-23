import { CommandContext, Context } from 'grammy';
import { getTracker } from '../../services/tracker.service';
import { findLatestPrice } from '../../repositories/price.repository';
import { CustomError } from '../../lib/custom.error';

export async function trackerCommand(ctx: CommandContext<Context>): Promise<void> {
  const hash = ctx.match.trim();
  if (hash === '') {
    await ctx.reply('Please send a valid tracker ID.');
    return;
  }

  try {
    const tracker = await getTracker(hash);
    const { url, website, title, alert_price } = tracker;

    const latestPrice = await findLatestPrice(hash);
    const alertText = alert_price ? `\n🎯 Alert at: ₹${alert_price}` : '';

    await ctx.reply(
      `${title ?? ''}\n${latestPrice ? 'Price: ₹' + latestPrice.price : ''}${alertText}\n\nID: ${hash}\nURL: ${url}`.trim(),
      {
        reply_markup: {
          inline_keyboard: [[{ text: 'View on ' + website.charAt(0).toUpperCase() + website.slice(1), url }]],
        },
      }
    );
  } catch (error) {
    if (error instanceof CustomError) {
      await ctx.reply(error.message);
      return;
    }
    console.error('UNEXPECTED ERROR:', error);
  }
}
