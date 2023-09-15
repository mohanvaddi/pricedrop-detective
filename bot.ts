import { Bot } from 'grammy';
import config from './config';
import { NewTrackerDTO } from './schemas/zod.schema';
import { BOT_COMMANDS } from './types/enums';
import TrackerUtils from './utils/tracker.utils';
import { CustomError } from './lib/custom.error';
import SupabaseUtils from './utils/supabse.utils';
import { readableDateTime } from './utils/common.utils';

const bot = new Bot(config.TELEGRAM_BOT_TOKEN);
const trackerUtils = new TrackerUtils();
const supabase = new SupabaseUtils();

bot.command([BOT_COMMANDS.START, BOT_COMMANDS.HELP], async (ctx) => {
  const userId = ctx.from!.id;
  try {
    const userExists = await supabase.checkIfUserExists(userId);
    if (!userExists) {
      const username = ctx.from!.username!;
      await supabase.createUser(userId, username);
      ctx.reply('User created: ' + userId);
    }
  } catch (error) {
    if (error instanceof CustomError) {
      return ctx.reply(error.message);
    }
    console.error('UNEXPECTED ERROR OCCOURED:: ' + JSON.stringify(error));
  }
  ctx.reply(
    "Get real time alerts on price changes and shop smarter with BargainSherlock by your side.\nFor now, It can only track prices from Amazon and Flipkart.\n\n/list\n/create <url> <website>\n/delete <hash>\n/history <hash>\n\nYou'll receive notification when price changes."
  );
});

bot.command(BOT_COMMANDS.CREATE, async (ctx) => {
  const [url, website] = ctx.match.split(' ');
  const input = NewTrackerDTO.safeParse({ url, website });

  if (!input.success) {
    return ctx.reply(input.error.issues[0]!.message);
  }

  try {
    const userId = ctx.from!.id;
    const { hash, currentPrice } = await trackerUtils.createTracker(userId, input.data);
    ctx.reply(`Current Price: ${currentPrice} \nI'll notify you when the price changes.`);
    return ctx.reply(`
      Tracker Hash: \n${hash} \n\nTo delete a tracker, use "/delete <tracker_hash>"
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
    return ctx.reply('Please send a valid tracker hash.');
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

bot.command(BOT_COMMANDS.LIST, async (ctx) => {
  const userId = ctx.from!.id;
  try {
    const trackers = await supabase.fetchTrackersByUser(userId);
    for (const { url, website, id } of trackers) {
      ctx.reply(`hash:${id}\n<a href="${url}">product</a>`, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'View Product on ' + <string>website.charAt(0).toUpperCase() + website.slice(1),
                url: url,
              },
            ],
          ],
        },
      });
    }
  } catch (error) {
    if (error instanceof CustomError) {
      return ctx.reply(error.message);
    }
    console.error('UNEXPECTED ERROR OCCOURED:: ' + JSON.stringify(error));
  }
});

bot.command(BOT_COMMANDS.HISTORY, async (ctx) => {
  const hash = ctx.match.trim();
  if (hash === '') {
    return ctx.reply('Please send a valid tracker hash');
  }

  try {
    const prices = await supabase.fetchPricesByTracker(hash);
    let pricesStr = '';
    prices.forEach(({ created_at, price }) => {
      pricesStr += `${readableDateTime(created_at)}   -->  ${price}\n`;
    });
    return ctx.reply(`Price History for ${hash}\n\n` + pricesStr);
  } catch (error) {
    if (error instanceof CustomError) {
      return ctx.reply(error.message);
    }
    console.error('UNEXPECTED ERROR OCCOURED:: ' + JSON.stringify(error));
  }
});

export default bot;
