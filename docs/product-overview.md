# Product Overview

**PriceDrop Detective** tracks the price of products on Indian e-commerce sites
and alerts users the moment a price drops (or a change they care about happens).
It is designed to be **free forever**, which shapes several product decisions
(shared scraping, conservative rate limits, adaptive polling).

## What it does

1. A user submits a **product URL** from a supported store.
2. The system scrapes the current **price, title, image, and availability**, and
   auto-**categorizes** the product.
3. It keeps re-checking the price on an **adaptive schedule** (faster for
   volatile/electronics, slower for stable/books).
4. When the price **drops/rises** or the item goes **in/out of stock**, it sends
   an **alert** to the user's chosen channel(s).
5. Users browse **price history**, set a **target alert price**, and organize
   trackers into **lists** (which can be shared publicly).

## Supported stores (14)

Amazon, Flipkart, Myntra, AJIO, Tata CLiQ, IKEA, Decathlon, Lenskart, Meesho,
Nykaa Fashion, Croma, JioMart, Blinkit, BigBasket.

Adding a store is a well-defined task — see the
[scraper-generator skill](../.github/skills/scraper-generator/SKILL.md) and
[scrapers.md](./scrapers.md). Each store uses one of four fetch strategies
depending on how aggressively it blocks bots.

## Notification channels

| Channel | How it's linked | Notes |
|---------|-----------------|-------|
| **Web app** | Register with email/password | React SPA dashboard, price charts |
| **Telegram** | Link Telegram account in Settings / bot commands | grammy bot |
| **Reddit** | Link Reddit username; interact via DMs | Optional, enabled when configured |

A single identity can link multiple channels (see the provider tables in
[db-structure.md](./db-structure.md)). Alerts fan out to every channel the
subscriber has linked.

## Features

- **Shared tracking.** Everyone tracking the same product shares one scrape —
  efficient and consistent. Product identity is a hash of the canonical URL.
- **Adaptive scrape frequency.** Interval derives from the product's **category**
  (e.g. electronics poll faster than books) and its **recent price volatility**
  (a product that just moved is polled more often). See
  [categorizer.md](./categorizer.md) and `scrapers/src/scheduler.ts`.
- **Analytics-grade history.** Even with no price change, a "keep-alive"
  observation is stored at least every 24h so charts and analytics stay
  continuous. Genuine changes additionally trigger alerts.
- **Alert types.** Price **drop**, price **increase**, **back in stock**, **out
  of stock**. Per-subscription target price (`alertPrice`) and a
  `notifyEveryChange` toggle.
- **Lists & sharing.** Group trackers into named lists; make a list public to
  share a read-only view.
- **Multi-surface add.** Track a product from the web app, a Telegram command, or
  a Reddit DM.

## Limits (free-forever guardrails)

Defined in [`shared/src/limits.ts`](../shared/src/limits.ts):

| Limit | Value | Why |
|-------|-------|-----|
| `MAX_TRACKERS_PER_USER` | 20 | Keep scraping load sustainable without monetization |
| `MAX_CUSTOM_LISTS` | 3 | Prevent abuse / runaway fan-out |

These are intentionally conservative and meant to be revisited once the system is
proven stable.

## What it is not

- Not a checkout/purchase bot — it only observes public product pages.
- Not a guaranteed real-time feed — cadence is adaptive (minutes to hours) by
  design to stay free and polite to stores.
- Some stores gate pricing by geography (e.g. JioMart needs an Indian IP); those
  scrapers are correct but require appropriate infrastructure.

## Related docs

- [code-architecture.md](./code-architecture.md) — how the pieces fit together.
- [workflow-architecture.md](./workflow-architecture.md) — the add/scrape/notify flows.
- [scrapers.md](./scrapers.md) — how scraping works and how to add a store.
