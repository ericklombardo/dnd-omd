/**
 * This is a logger with no external dependencies, that allows log level configuration.
 */
const Levels = {
  off: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
} as const;

// Define color codes for different log levels
const colors = {
  debug: "34", // Blue
  info: "32", // Green
  warn: "33", // Yellow
  error: "31", // Red
};

interface Meta {
  [key: string]: unknown;
}

const defaultMeta = { app: "OMD" };

const logTime = () => {
  const now = new Date();
  return now.toISOString().substring(0, 19); // This is not year 10k safe.
};

const colorize = (text: string, colorCode: string): string =>
  `\x1b[${colorCode}m${text}\x1b[0m`;

const getLogLevel = (): string => {
  const minLogLevel = process.env.MIN_LOG_LEVEL;
  if (!minLogLevel) {
    return "warn";
  }
  return minLogLevel;
};
const logLevel = (level: keyof typeof Levels): boolean =>
  Levels[getLogLevel() as keyof typeof Levels] >= Levels[level];

// We are using console.info here because CloudWatch treats console.debug special.
export const debug = (message: string, meta?: Meta): void =>
  logLevel("debug")
    ? console.info(logTime(), colorize("debug", colors.debug), message, {
        ...defaultMeta,
        ...meta,
      })
    : undefined;

export const info = (message: string, meta?: Meta): void =>
  logLevel("info")
    ? console.info(logTime(), colorize("info", colors.info), message, {
        ...defaultMeta,
        ...meta,
      })
    : undefined;

export const warn = (message: string, meta?: Meta): void =>
  logLevel("warn")
    ? console.warn(
        logTime(),
        colorize("warn", colors.warn),
        message,
        Object.assign(defaultMeta, meta),
      )
    : undefined;

export const error = (message: string, meta?: Meta): void =>
  logLevel("error")
    ? console.error(logTime(), colorize("error", colors.error), message, {
        ...defaultMeta,
        ...meta,
      })
    : undefined;

export const log = (message: string, meta?: Meta): void =>
  console.log(logTime(), message, { ...defaultMeta, ...meta });

// This is a convenience object that allows us to import all of the loggers
export const logger = { debug, info, warn, error, log };
