import { CommandContext, Context } from 'grammy';
import { setTrackerAlert } from '../../services/tracker.service';
import { CustomError } from '../../lib/custom.error';

export async function setAlertCommand(ctx: CommandContext<Context>): Promise<void> {
  const parts = ctx.match.trim().split(/\s+/);
  const hash = parts[0];
  const priceStr = parts[1];

  if (!hash) {
    await ctx.reply('Usage: /setalert <tracker_id> <target_price>\nExample: /setalert a1b2c3d4 4999');
    return;
  }

  if (!priceStr) {
    await ctx.reply('Usage: /setalert <tracker_id> <target_price>\nExample: /setalert a1b2c3d4 4999');
    return;
  }

  const alertPrice = parseInt(priceStr, 10);
  if (isNaN(alertPrice) || alertPrice <= 0) {
    await ctx.reply('Target price must be a positive number.');
    return;
  }

  try {
    await setTrackerAlert(hash, ctx.from!.id, alertPrice);
    await ctx.reply(`🎯 Alert set! You'll be notified when the price drops to ₹${alertPrice} or below.`);
  } catch (error) {
    if (error instanceof CustomError) {
      await ctx.reply(error.message);
      return;
    }
    console.error('UNEXPECTED ERROR:', error);
  }
}
