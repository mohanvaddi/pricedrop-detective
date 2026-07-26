import { getUnreadMessages, sendDM, markRead } from './client';
import { createTracker, removeTracker, getTrackersByUser } from '../../src/services/tracker';
import { findOrCreateRedditUser } from '../../src/db/users';
import { NewTrackerDTO } from '../../src/constants/schema';
import { CustomError } from '../../constants/error';

async function handleMessage(author: string, body: string): Promise<string> {
  const userId = await findOrCreateRedditUser(author);
  const [command, ...args] = body.trim().split(/\s+/);

  switch (command?.toLowerCase()) {
    case '!create':
    case '/create': {
      const url = args[0];
      const website = args[1];
      const input = NewTrackerDTO.safeParse({ url, website });
      if (!input.success) return input.error.issues[0]!.message;
      const { hash, currentPrice } = await createTracker(userId, input.data);
      return `✅ Tracking started!\nCurrent Price: ₹${currentPrice}\nTracker ID: ${hash}\n\nTo delete: reply with \`/delete ${hash}\``;
    }

    case '!delete':
    case '/delete': {
      const hash = args[0];
      if (!hash) return 'Usage: /delete <tracker_id>';
      await removeTracker(hash, userId);
      return 'Unsubscribed from product.';
    }

    case '!list':
    case '/list': {
      const trackers = await getTrackersByUser(userId);
      if (trackers.length === 0) return 'You have no active trackers. Reply with `/create <url>` to start.';
      return trackers
        .map(({ product, subscription }) => {
          const alertText = subscription.alert_price ? ` | Alert: ₹${subscription.alert_price}` : '';
          return `• ${product.title ?? product.url}\n  ID: ${product.id}${alertText}`;
        })
        .join('\n\n');
    }

    case '!help':
    case '/help':
    default:
      return (
        'PriceDrop Detective — Reddit Bot\n\n' +
        '`/create <url>` — Start tracking a product\n' +
        '`/list` — View your active trackers\n' +
        '`/delete <id>` — Stop tracking a product'
      );
  }
}

export async function processDMs(): Promise<void> {
  const messages = await getUnreadMessages();
  if (messages.length === 0) return;

  const toMark: string[] = [];
  for (const msg of messages) {
    try {
      const reply = await handleMessage(msg.author, msg.body);
      await sendDM(msg.author, `Re: ${msg.subject}`, reply);
    } catch (error) {
      if (error instanceof CustomError) {
        await sendDM(msg.author, `Re: ${msg.subject}`, `⚠️ ${error.message}`).catch(() => undefined);
      } else {
        console.error('[reddit] Unexpected error handling DM from', msg.author, error);
      }
    }
    toMark.push(msg.name);
  }
  await markRead(toMark);
}

export async function sendPriceAlert(redditUsername: string, message: string): Promise<void> {
  await sendDM(redditUsername, '📊 Price Alert — PriceDrop Detective', message);
}
