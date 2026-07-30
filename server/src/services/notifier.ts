import bot from '../../bots/telegram';
import config from '../../config';
import {
  findPendingNotifications,
  markNotificationSent,
  type NotificationQueue,
} from '@pricedrop/shared/db/notifications';
import { findProduct } from '@pricedrop/shared/db/products';
import { findSubscribersForProduct } from '@pricedrop/shared/db/subscriptions';

const REDDIT_ENABLED = Boolean(config.REDDIT_CLIENT_ID && config.REDDIT_USERNAME);
const POLL_INTERVAL_MS = 30_000;

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildMessages(
  n: NotificationQueue,
  title: string | null,
  url: string,
): { plain: string; html: string } {
  const head = title ? `${title}\n` : '';
  if (n.changeType === 'drop' || n.changeType === 'increase') {
    const oldP = n.oldPrice ?? 0;
    const newP = n.newPrice ?? 0;
    const emoji = n.changeType === 'drop' ? '📉' : '📈';
    const direction = n.changeType === 'drop' ? 'dropped' : 'increased';
    const pct = oldP ? (Math.abs((newP - oldP) / oldP) * 100).toFixed(2) : '0.00';
    return {
      plain: `${emoji} ${head}Price ${direction} from ₹${oldP} to ₹${newP} (${pct}%)\n${url}`,
      html: `${emoji} ${head}Price ${direction} from ₹${oldP} to ₹${newP} (${pct}%)\n<a href="${url}">View product</a>`,
    };
  }
  if (n.changeType === 'back_in_stock') {
    return {
      plain: `✅ ${head}Back in stock at ₹${n.newPrice ?? ''}\n${url}`,
      html: `✅ ${head}Back in stock at ₹${n.newPrice ?? ''}\n<a href="${url}">View product</a>`,
    };
  }
  // out_of_stock
  return {
    plain: `⛔ ${head}Now out of stock\n${url}`,
    html: `⛔ ${head}Now out of stock\n<a href="${url}">View product</a>`,
  };
}

async function deliver(n: NotificationQueue): Promise<void> {
  const product = await findProduct(n.productId);
  if (!product) {
    // Product gone — drop the notification.
    await markNotificationSent(n.id);
    return;
  }

  const subscribers = await findSubscribersForProduct(n.productId);
  const { plain, html } = buildMessages(n, product.title, product.url);
  const isPriceMove = n.changeType === 'drop' || n.changeType === 'increase';

  for (const { alert_price, notify_every_change, channel, channel_id } of subscribers) {
    // Alert-only subscribers: only notify on a drop at/below their alert price.
    if (isPriceMove && !notify_every_change) {
      if (n.changeType !== 'drop' || alert_price === null || (n.newPrice ?? Infinity) > alert_price) continue;
    }

    if (channel === 'telegram' && typeof channel_id === 'string' && bot) {
      await bot.api
        .sendMessage(parseInt(channel_id, 10), html, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{ text: 'View on ' + titleCase(product.website), url: product.url }]],
          },
        })
        .catch(() => undefined);
    } else if (channel === 'reddit' && REDDIT_ENABLED) {
      const { sendPriceAlert } = await import('../../bots/reddit');
      await sendPriceAlert(String(channel_id), plain).catch(() => undefined);
    }
    // web: future email notification
  }

  await markNotificationSent(n.id);
}

async function drainOnce(): Promise<void> {
  const pending = await findPendingNotifications(50);
  for (const n of pending) {
    try {
      await deliver(n);
    } catch (err) {
      console.error('[notifier] delivery error for', n.id, err);
    }
  }
}

/** Start the notification poller that drains the notification_queue outbox. */
export function startNotificationPoller(): void {
  const tick = async () => {
    try {
      await drainOnce();
    } catch (err) {
      console.error('[notifier] poll error:', err);
    }
  };
  void tick();
  setInterval(() => void tick(), POLL_INTERVAL_MS);
  console.log(`Notification poller started (every ${POLL_INTERVAL_MS / 1000}s)`);
}
