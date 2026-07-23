import { CommandContext, Context } from 'grammy';
import { getOrCreateUser } from '../../services/user.service';
import { CustomError } from '../../lib/custom.error';

export async function startCommand(ctx: CommandContext<Context>): Promise<void> {
  const userId = ctx.from!.id;
  try {
    await getOrCreateUser(userId, ctx.from!.username ?? '');
  } catch (error) {
    if (error instanceof CustomError) {
      await ctx.reply(error.message);
      return;
    }
    console.error('UNEXPECTED ERROR:', error);
  }

  await ctx.reply(
    'Get real-time alerts on price changes and shop smarter with BargainSherlock.\n' +
      'Tracks prices on Amazon and Flipkart (auto-detected from URL).\n\n' +
      '/create <url> — Start tracking a product\n' +
      '/list — View your active trackers with current prices\n' +
      '/tracker <id> — View details for a specific tracker\n' +
      '/setalert <id> <price> — Notify only when price drops below target\n' +
      '/history <id> — View price history\n' +
      '/delete <id> — Stop tracking a product\n\n' +
      "You'll receive a notification whenever the price changes."
  );
}
