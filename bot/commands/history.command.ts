import { CommandContext, Context } from 'grammy';
import { findPricesByTracker } from '../../repositories/price.repository';
import { readableDateTime } from '../../utils/common.utils';
import { CustomError } from '../../lib/custom.error';

export async function historyCommand(ctx: CommandContext<Context>): Promise<void> {
  const hash = ctx.match.trim();
  if (hash === '') {
    await ctx.reply('Please send a valid tracker hash.');
    return;
  }

  try {
    const prices = await findPricesByTracker(hash);
    const pricesStr = prices.map(({ created_at, price }) => `${readableDateTime(created_at)}   -->  ${price}`).join('\n');
    await ctx.reply(`Price History for ${hash}\n\n` + pricesStr);
  } catch (error) {
    if (error instanceof CustomError) {
      await ctx.reply(error.message);
      return;
    }
    console.error('UNEXPECTED ERROR:', error);
  }
}
