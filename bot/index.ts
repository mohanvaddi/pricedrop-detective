import { Bot } from 'grammy';
import config from '../config';
import { BOT_COMMANDS } from '../types/enums';
import { startCommand } from './commands/start.command';
import { createCommand } from './commands/create.command';
import { deleteCommand } from './commands/delete.command';
import { listCommand } from './commands/list.command';
import { trackerCommand } from './commands/tracker.command';
import { historyCommand } from './commands/history.command';
import { setAlertCommand } from './commands/setalert.command';

const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

bot.command([BOT_COMMANDS.START, BOT_COMMANDS.HELP], startCommand);
bot.command(BOT_COMMANDS.CREATE, createCommand);
bot.command(BOT_COMMANDS.DELETE, deleteCommand);
bot.command(BOT_COMMANDS.LIST, listCommand);
bot.command(BOT_COMMANDS.TRACKER, trackerCommand);
bot.command(BOT_COMMANDS.HISTORY, historyCommand);
bot.command(BOT_COMMANDS.SETALERT, setAlertCommand);

export default bot;
