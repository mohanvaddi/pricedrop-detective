export const BOT_COMMANDS = {
  START: 'start',
  HELP: 'help',
  CREATE: 'create',
  DELETE: 'delete',
  LIST: 'list',
  HISTORY: 'history',
  TRACKER: 'tracker',
  SETALERT: 'setalert',
} as const;

export type BOT_COMMANDS = (typeof BOT_COMMANDS)[keyof typeof BOT_COMMANDS];
