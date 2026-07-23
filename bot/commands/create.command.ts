import { CommandContext, Context } from 'grammy';
import { NewTrackerDTO } from '../../schemas/zod.schema';
import { createTracker } from '../../services/tracker.service';
import { CustomError } from '../../lib/custom.error';

export async function createCommand(ctx: CommandContext<Context>): Promise<void> {
  const parts = ctx.match.trim().split(/\s+/);
  const url = parts[0];
  const website = parts[1];

  const input = NewTrackerDTO.safeParse({ url, website });
  if (!input.success) {
    await ctx.reply(input.error.issues[0]!.message);
    return;
  }

  try {
    const { hash, currentPrice } = await createTracker(ctx.from!.id, input.data);
    await ctx.reply(`Current Price: ₹${currentPrice}\nI'll notify you when the price changes.`);
    await ctx.reply(`Tracker ID:\n${hash}\n\nTo delete: /delete ${hash}`);
  } catch (error) {
    if (error instanceof CustomError) {
      await ctx.reply(error.message);
      return;
    }
    console.error('UNEXPECTED ERROR:', error);
  }
}
