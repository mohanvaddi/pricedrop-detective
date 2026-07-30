/**
 * Minimal structured logger for the scrapers service. Keeps a single format
 * across the HTTP endpoint and the cron worker so logs are easy to grep.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, scope: string, msg: string, meta?: unknown): void {
  const ts = new Date().toISOString();
  const base = `${ts} [${level.toUpperCase()}] [${scope}] ${msg}`;
  if (meta !== undefined) {
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](base, meta);
  } else {
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](base);
  }
}

export function createLogger(scope: string) {
  return {
    debug: (msg: string, meta?: unknown) => emit('debug', scope, msg, meta),
    info: (msg: string, meta?: unknown) => emit('info', scope, msg, meta),
    warn: (msg: string, meta?: unknown) => emit('warn', scope, msg, meta),
    error: (msg: string, meta?: unknown) => emit('error', scope, msg, meta),
  };
}

export type Logger = ReturnType<typeof createLogger>;
