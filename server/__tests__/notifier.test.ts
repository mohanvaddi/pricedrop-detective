jest.mock('@pricedrop/shared/db/notifications', () => ({
  findPendingNotifications: jest.fn(),
  markNotificationSent: jest.fn(),
}));
jest.mock('@pricedrop/shared/db/products', () => ({ findProduct: jest.fn() }));
jest.mock('@pricedrop/shared/db/subscriptions', () => ({ findSubscribersForProduct: jest.fn() }));

jest.mock('../bots/telegram', () => ({ __esModule: true, default: { api: { sendMessage: jest.fn() } } }));

import botDefault from '../bots/telegram';
import { findPendingNotifications, markNotificationSent } from '@pricedrop/shared/db/notifications';
import { findProduct } from '@pricedrop/shared/db/products';
import { findSubscribersForProduct } from '@pricedrop/shared/db/subscriptions';
import { drainOnce } from '../src/services/notifier';

const mockSendMessage = (botDefault as unknown as { api: { sendMessage: jest.Mock } }).api.sendMessage;

const mockPending = findPendingNotifications as jest.Mock;
const mockProduct = findProduct as jest.Mock;
const mockSubs = findSubscribersForProduct as jest.Mock;
const mockMarkSent = markNotificationSent as jest.Mock;

const PRODUCT = { id: 'p1', title: 'Sony Headphones', url: 'https://x/p', website: 'amazon' };

function telegramSub(overrides = {}) {
  return { alert_price: null, notify_every_change: true, channel: 'telegram', channel_id: '12345', ...overrides };
}

function notif(overrides = {}) {
  return { id: 'n1', productId: 'p1', changeType: 'drop', oldPrice: 5000, newPrice: 4000, ...overrides };
}

beforeEach(() => {
  mockSendMessage.mockResolvedValue(undefined);
  mockProduct.mockResolvedValue(PRODUCT);
});

describe('drainOnce → deliver', () => {
  it('sends a drop message with the correct percentage and marks it sent', async () => {
    mockPending.mockResolvedValue([notif()]);
    mockSubs.mockResolvedValue([telegramSub()]);

    await drainOnce();

    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    const [chatId, html] = mockSendMessage.mock.calls[0];
    expect(chatId).toBe(12345);
    expect(html).toContain('📉');
    expect(html).toContain('dropped');
    expect(html).toContain('20.00%');
    expect(mockMarkSent).toHaveBeenCalledWith('n1');
  });

  it('formats an increase message', async () => {
    mockPending.mockResolvedValue([notif({ changeType: 'increase', oldPrice: 4000, newPrice: 5000 })]);
    mockSubs.mockResolvedValue([telegramSub()]);

    await drainOnce();

    const html = mockSendMessage.mock.calls[0][1];
    expect(html).toContain('📈');
    expect(html).toContain('increased');
    expect(html).toContain('25.00%');
  });

  it('formats a back_in_stock message', async () => {
    mockPending.mockResolvedValue([notif({ changeType: 'back_in_stock', newPrice: 4000 })]);
    mockSubs.mockResolvedValue([telegramSub()]);

    await drainOnce();

    expect(mockSendMessage.mock.calls[0][1]).toContain('✅');
  });

  it('formats an out_of_stock message', async () => {
    mockPending.mockResolvedValue([notif({ changeType: 'out_of_stock' })]);
    mockSubs.mockResolvedValue([telegramSub()]);

    await drainOnce();

    expect(mockSendMessage.mock.calls[0][1]).toContain('⛔');
  });

  it('skips alert-only subscribers when the drop is above their alert price', async () => {
    mockPending.mockResolvedValue([notif({ newPrice: 4000 })]);
    mockSubs.mockResolvedValue([telegramSub({ notify_every_change: false, alert_price: 3000 })]);

    await drainOnce();

    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(mockMarkSent).toHaveBeenCalledWith('n1'); // still drained
  });

  it('notifies alert-only subscribers when the drop is at/below their alert price', async () => {
    mockPending.mockResolvedValue([notif({ newPrice: 2900 })]);
    mockSubs.mockResolvedValue([telegramSub({ notify_every_change: false, alert_price: 3000 })]);

    await drainOnce();

    expect(mockSendMessage).toHaveBeenCalledTimes(1);
  });

  it('skips alert-only subscribers on a price increase', async () => {
    mockPending.mockResolvedValue([notif({ changeType: 'increase', oldPrice: 4000, newPrice: 5000 })]);
    mockSubs.mockResolvedValue([telegramSub({ notify_every_change: false, alert_price: 6000 })]);

    await drainOnce();

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('drops the notification when the product no longer exists', async () => {
    mockProduct.mockResolvedValue(null);
    mockPending.mockResolvedValue([notif()]);

    await drainOnce();

    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(mockMarkSent).toHaveBeenCalledWith('n1');
  });
});
