import { Bot } from 'grammy';
import config from './config';
import { NewTrackerDTO } from './schemas/zod.schema';
import { BOT_COMMANDS } from './types/enums';
import TrackerUtils from './utils/tracker.utils';
import { CustomError } from './lib/custom.error';

const bot = new Bot(config.TELEGRAM_BOT_TOKEN);
const trackerUtils = new TrackerUtils();

bot.command([BOT_COMMANDS.START, BOT_COMMANDS.HELP], (ctx) => {
  ctx.reply(
    "I can help you track prices for products.\nFor now, It support Amazon and Flipkart (Planning to add more in the future)\n\n/create <url> <website>\n/delete <hash>\n\nYou'll receive notifications in @MV01Price channel"
  );
});

bot.command(BOT_COMMANDS.CREATE, async (ctx) => {
  const [url, website] = ctx.match.split(' ');
  const input = NewTrackerDTO.safeParse({ url, website });

  if (!input.success) {
    return ctx.reply(input.error.issues[0]!.message);
  }

  try {
    const { hash, currentPrice } = await trackerUtils.createTracker(input.data);
    ctx.reply(`Current Price: ${currentPrice} \nWe'll notify once the price changes.`);
    return ctx.reply(`
      Tracker Hash: \n ${hash} \n\nTo delete a tracker, use "/delete <tracker_hash>"
    `);
  } catch (error) {
    if (error instanceof CustomError) {
      return ctx.reply(error.message);
    }
    console.error('UNEXPECTED ERROR OCCOURED:: ' + JSON.stringify(error));
  }
});

bot.command(BOT_COMMANDS.DELETE, async (ctx) => {
  const hash = ctx.match.trim();
  if (hash === '') {
    return ctx.reply('Please send a valid tracker hash');
  }

  try {
    const resp = await trackerUtils.removeTracker(hash);
    return ctx.reply(resp);
  } catch (error) {
    if (error instanceof CustomError) {
      return ctx.reply(error.message);
    }
    console.error('UNEXPECTED ERROR OCCOURED:: ' + JSON.stringify(error));
  }
});

export default bot;
