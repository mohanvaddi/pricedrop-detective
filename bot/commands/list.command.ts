import { CommandContext, Context } from 'grammy';
import { getTrackersByUser } from '../../services/tracker.service';
import { findLatestPrice } from '../../repositories/price.repository';
import { CustomError } from '../../lib/custom.error';

export async function listCommand(ctx: CommandContext<Context>): Promise<void> {
  try {
    const trackers = await getTrackersByUser(ctx.from!.id);

    if (trackers.length === 0) {
      await ctx.reply('You have no active trackers. Use /create <url> to start tracking a product.');
      return;
    }

    for (const { url, website, id, title, alert_price } of trackers) {
      const latest = await findLatestPrice(id);
      const priceText = latest ? `₹${latest.price}` : 'N/A';
      const alertText = alert_price ? `\n🎯 Alert at: ₹${alert_price}` : '';

      await ctx.reply(
        `${title ?? `<a href="${url}">Product URL</a>`}\n\nCurrent Price: ${priceText}${alertText}\nID: ${id}`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: 'View on ' + website.charAt(0).toUpperCase() + website.slice(1), url }],
            ],
          },
        }
      );
    }
  } catch (error) {
    if (error instanceof CustomError) {
      await ctx.reply(error.message);
      return;
    }
    console.error('UNEXPECTED ERROR:', error);
  }
}
