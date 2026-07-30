import { CommandContext, Context } from 'grammy';
import { NewTrackerDTO } from '../../src/constants/schema';
import { CustomError } from '@pricedrop/shared/error';
import { readableDateTime } from '@pricedrop/shared/format';
import { createTracker, removeTracker, getTrackersByUser, getTracker, setTrackerAlert } from '../../src/services/tracker';
import { getOrCreateTelegramUser } from '../../src/services/user';
import { findLatestPrice, findPricesByProduct } from '@pricedrop/shared/db/prices';

/** Resolve a Telegram user ID to the abstract UUID, creating the user if needed. */
async function resolveUserId(ctx: CommandContext<Context>): Promise<string> {
  return getOrCreateTelegramUser(ctx.from!.id, ctx.from!.username ?? '');
}

export async function startCommand(ctx: CommandContext<Context>): Promise<void> {
  try {
    await resolveUserId(ctx);
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
    const userId = await resolveUserId(ctx);
    const { hash, currentPrice } = await createTracker(userId, input.data);
    await ctx.reply(`✅ Tracking started!\nCurrent Price: ₹${currentPrice}\nI'll notify you when the price changes.`);
    await ctx.reply(`Tracker ID:\n${hash}\n\nTo delete: /delete ${hash}`);
  } catch (error) {
    if (error instanceof CustomError) {
      await ctx.reply(error.message);
      return;
    }
    console.error('UNEXPECTED ERROR:', error);
  }
}

export async function deleteCommand(ctx: CommandContext<Context>): Promise<void> {
  const hash = ctx.match.trim();
  if (hash === '') {
    await ctx.reply('Please send a valid tracker ID.');
    return;
  }

  try {
    const userId = await resolveUserId(ctx);
    await removeTracker(hash, userId);
    await ctx.reply('Unsubscribed from product.');
  } catch (error) {
    if (error instanceof CustomError) {
      await ctx.reply(error.message);
      return;
    }
    console.error('UNEXPECTED ERROR:', error);
  }
}

export async function listCommand(ctx: CommandContext<Context>): Promise<void> {
  try {
    const userId = await resolveUserId(ctx);
    const trackers = await getTrackersByUser(userId);

    if (trackers.length === 0) {
      await ctx.reply('You have no active trackers. Use /create <url> to start tracking a product.');
      return;
    }

    for (const { product, subscription } of trackers) {
      const { url, website, id, title } = product;
      const { alertPrice } = subscription;
      const latest = await findLatestPrice(id);
      const priceText = latest ? `₹${latest.price}` : 'N/A';
      const alertText = alertPrice ? `\n🎯 Alert at: ₹${alertPrice}` : '';

      await ctx.reply(
        `${title ?? `<a href="${url}">Product URL</a>`}\n\nCurrent Price: ${priceText}${alertText}\nID: ${id}`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{ text: 'View on ' + website.charAt(0).toUpperCase() + website.slice(1), url }]],
          },
        },
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

export async function trackerCommand(ctx: CommandContext<Context>): Promise<void> {
  const hash = ctx.match.trim();
  if (hash === '') {
    await ctx.reply('Please send a valid tracker ID.');
    return;
  }

  try {
    const userId = await resolveUserId(ctx);
    const { product, subscription } = await getTracker(hash, userId);
    const { url, website, title } = product;
    const { alertPrice } = subscription;

    const latestPrice = await findLatestPrice(hash);
    const alertText = alertPrice ? `\n🎯 Alert at: ₹${alertPrice}` : '';

    await ctx.reply(
      `${title ?? ''}\n${latestPrice ? 'Price: ₹' + latestPrice.price : ''}${alertText}\n\nID: ${hash}\nURL: ${url}`.trim(),
      {
        reply_markup: {
          inline_keyboard: [[{ text: 'View on ' + website.charAt(0).toUpperCase() + website.slice(1), url }]],
        },
      },
    );
  } catch (error) {
    if (error instanceof CustomError) {
      await ctx.reply(error.message);
      return;
    }
    console.error('UNEXPECTED ERROR:', error);
  }
}

export async function historyCommand(ctx: CommandContext<Context>): Promise<void> {
  const hash = ctx.match.trim();
  if (hash === '') {
    await ctx.reply('Please send a valid tracker hash.');
    return;
  }

  try {
    const prices = await findPricesByProduct(hash);
    const pricesStr = prices
      .map(({ createdAt, price }) => `${readableDateTime(createdAt)}   -->  ${price}`)
      .join('\n');
    await ctx.reply(`Price History for ${hash}\n\n` + pricesStr);
  } catch (error) {
    if (error instanceof CustomError) {
      await ctx.reply(error.message);
      return;
    }
    console.error('UNEXPECTED ERROR:', error);
  }
}

export async function setAlertCommand(ctx: CommandContext<Context>): Promise<void> {
  const parts = ctx.match.trim().split(/\s+/);
  const hash = parts[0];
  const priceStr = parts[1];

  if (!hash || !priceStr) {
    await ctx.reply('Usage: /setalert <tracker_id> <target_price>\nExample: /setalert a1b2c3d4 4999');
    return;
  }

  const alertPrice = parseInt(priceStr, 10);
  if (isNaN(alertPrice) || alertPrice <= 0) {
    await ctx.reply('Target price must be a positive number.');
    return;
  }

  try {
    const userId = await resolveUserId(ctx);
    await setTrackerAlert(hash, userId, alertPrice);
    await ctx.reply(`🎯 Alert set! You'll be notified when the price drops to ₹${alertPrice} or below.`);
  } catch (error) {
    if (error instanceof CustomError) {
      await ctx.reply(error.message);
      return;
    }
    console.error('UNEXPECTED ERROR:', error);
  }
}
