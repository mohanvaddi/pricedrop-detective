# Pricedrop Detective ([BargainSherlock](https://t.me/MVQ1priceBot))

<p align="center">
  <img src="https://github.com/mohanvaddi/pricedrop-detective/assets/58596948/201cdfa3-a263-4c0e-8afb-25e7499b935f" alt="BargainSherlock Logo" width="200">
</p>

## Table of Contents

- [Features](#features)
- [Usage](#usage)
- [Installation](#installation)
- [Contributing](#contributing)

## Features

- 🚀 Real-time price tracking for your favorite products.
- 💼 Track multiple products simultaneously.
- 🗂️ Organize and manage your tracked products.
- 📊 Price history to check trends.
- 🌟 User-friendly and privacy-conscious.
<!-- - 🔔 Customizable price change alerts. -->

## Usage

1. **Getting Started:** Start a chat with [BargainSherlock](https://t.me/MVQ1priceBot) on Telegram.
2. **Add Products:** Use the `/create <url> <website>` command to add products to your tracking list. Provide the product URL and website, and BargainSherlock will start monitoring it for price changes.
3. **List Trackers:** Use `/list` to get all your trackers. It will give tracker_hash and product link.
4. **Get Tracker:** Use `/tracker <tracker_hash>` to get tracker details.
5. **Delete Tracker:** Use the `/delete <tracker_hash>` command to customize your alert preferences.
6. **Help:** Use `/help` to know how to use the bot.
7. **Stay Informed:** Receive real-time updates on price drops and deals.

## Installation

If you'd like to run your own instance of BargainSherlock or contribute to its development, follow the [Installation Guide](docs/installation.md).

## Contributing

We welcome contributions from the community! Whether you're a developer, designer, or have other skills to offer, your contributions can help improve _BargainSherlock_.
Here's how you can get involved:

- Report bugs or suggest new features by opening GitHub Issues.
- Contribute code by forking the repository and submitting a pull request.
- Help improve the documentation by submitting changes to this README or other documentation files.


pricedrop-detective/
├── bot/
│   ├── index.ts          ← bot setup + command registration
│   └── commands.ts       ← all command handlers in one file
├── db/
│   ├── client.ts         ← supabase client
│   ├── database.types.ts ← auto-generated (pnpm db:gen-types)
│   ├── trackers.ts       ← tracker queries
│   ├── prices.ts         ← price queries
│   └── users.ts          ← user queries
├── services/
│   ├── tracker.ts        ← tracker logic
│   └── user.ts           ← user logic
├── scraper/
│   ├── index.ts          ← scraping + price/title extraction
│   └── selectors.json    ← CSS selectors per platform
├── constants/
│   ├── enums.ts          ← BOT_COMMANDS enum
│   ├── error.ts          ← CustomError class
│   ├── schema.ts         ← Zod schemas + detectPlatform
│   ├── types.ts          ← Tracker, User, Price interfaces
│   └── utils.ts          ← hash, date helpers
├── scripts/              ← misc. scripts
├── migrations/           ← db migrations
├── server.ts             ← Express app
└── config.ts
