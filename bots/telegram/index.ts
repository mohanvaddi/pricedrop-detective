import { Bot } from 'grammy';
import config from '../../config';
import { BOT_COMMANDS } from '../../constants/enums';
import { startCommand, createCommand, deleteCommand, listCommand, trackerCommand, historyCommand, setAlertCommand } from './commands';

const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

bot.command([BOT_COMMANDS.START, BOT_COMMANDS.HELP], startCommand);
bot.command(BOT_COMMANDS.CREATE, createCommand);
bot.command(BOT_COMMANDS.DELETE, deleteCommand);
bot.command(BOT_COMMANDS.LIST, listCommand);
bot.command(BOT_COMMANDS.TRACKER, trackerCommand);
bot.command(BOT_COMMANDS.HISTORY, historyCommand);
bot.command(BOT_COMMANDS.SETALERT, setAlertCommand);

export default bot;
