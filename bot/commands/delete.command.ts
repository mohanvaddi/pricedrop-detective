import { CommandContext, Context } from 'grammy';
import { removeTracker } from '../../services/tracker.service';
import { CustomError } from '../../lib/custom.error';

export async function deleteCommand(ctx: CommandContext<Context>): Promise<void> {
  const hash = ctx.match.trim();
  if (hash === '') {
    await ctx.reply('Please send a valid tracker ID.');
    return;
  }

  try {
    await removeTracker(hash, ctx.from!.id);
    await ctx.reply('Tracker deleted.');
  } catch (error) {
    if (error instanceof CustomError) {
      await ctx.reply(error.message);
      return;
    }
    console.error('UNEXPECTED ERROR:', error);
  }
}
